import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  activity,
  assignment,
  auditLog,
  instrumentAsset,
  instrumentType,
  instrumentUnit,
  laboratory,
  material,
  materialBatch,
  materialDispensingRule,
  resourceRequest,
  room,
  toolAsset,
  toolType,
  toolUnit,
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { invalidateRoomScope } from "@/services/access-scope.service";
import { writeAudit } from "@/services/audit.service";
import { recordStockTransaction } from "@/services/stock.service";
import {
  countActiveAssignments,
  getInventoryHealth,
} from "@/services/analytics.service";
import type {
  AssignmentInput,
  EquipmentAssetInput,
  EquipmentTypeInput,
  EquipmentUnitInput,
  LaboratoryInput,
  MaterialBatchInput,
  MaterialInput,
  RoomInput,
} from "@/validators/admin";

type Update<T> = Partial<T>;

async function requireRow<T>(
  finder: () => Promise<T | undefined>,
  message: string,
): Promise<T> {
  const row = await finder();
  if (!row) throw new ApiError(404, "NOT_FOUND", message);
  return row;
}

async function assertCodeFree(
  exec: DbExecutor,
  table:
    | "room"
    | "equipment_asset"
    | "equipment_unit"
    | "instrument_asset"
    | "instrument_unit"
    | "tool_asset"
    | "tool_unit"
    | "material"
    | "laboratory",
  code: string,
  excludeId?: string,
) {
  if (
    table === "equipment_asset" ||
    table === "instrument_asset" ||
    table === "tool_asset"
  ) {
    const [instResult, toolResult] = await Promise.all([
      excludeId
        ? exec.execute<{ id: string }>(
            sql`SELECT id FROM instrument_asset WHERE asset_code = ${code} AND id <> ${excludeId} LIMIT 1`,
          )
        : exec.execute<{ id: string }>(
            sql`SELECT id FROM instrument_asset WHERE asset_code = ${code} LIMIT 1`,
          ),
      excludeId
        ? exec.execute<{ id: string }>(
            sql`SELECT id FROM tool_asset WHERE asset_code = ${code} AND id <> ${excludeId} LIMIT 1`,
          )
        : exec.execute<{ id: string }>(
            sql`SELECT id FROM tool_asset WHERE asset_code = ${code} LIMIT 1`,
          ),
    ]);
    if (instResult.rows.length > 0 || toolResult.rows.length > 0)
      throw new ApiError(409, "CODE_TAKEN", `Kode aset ${code} sudah dipakai.`);
    return;
  }

  if (
    table === "equipment_unit" ||
    table === "instrument_unit" ||
    table === "tool_unit"
  ) {
    const [instResult, toolResult] = await Promise.all([
      excludeId
        ? exec.execute<{ id: string }>(
            sql`SELECT id FROM instrument_unit WHERE code = ${code} AND id <> ${excludeId} LIMIT 1`,
          )
        : exec.execute<{ id: string }>(
            sql`SELECT id FROM instrument_unit WHERE code = ${code} LIMIT 1`,
          ),
      excludeId
        ? exec.execute<{ id: string }>(
            sql`SELECT id FROM tool_unit WHERE code = ${code} AND id <> ${excludeId} LIMIT 1`,
          )
        : exec.execute<{ id: string }>(
            sql`SELECT id FROM tool_unit WHERE code = ${code} LIMIT 1`,
          ),
    ]);
    if (instResult.rows.length > 0 || toolResult.rows.length > 0)
      throw new ApiError(409, "CODE_TAKEN", `Kode unit ${code} sudah dipakai.`);
    return;
  }

  const column = "code";
  const result = excludeId
    ? await exec.execute<{ id: string }>(
        sql`SELECT id FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${code} AND id <> ${excludeId} LIMIT 1`,
      )
    : await exec.execute<{ id: string }>(
        sql`SELECT id FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${code} LIMIT 1`,
      );
  if (result.rows.length > 0)
    throw new ApiError(409, "CODE_TAKEN", `Kode ${code} sudah dipakai.`);
}

// ---------------------------------------------------------------- laboratories

export async function listLaboratories() {
  return db.select().from(laboratory).orderBy(asc(laboratory.code));
}

export async function createLaboratory(actorId: string, input: LaboratoryInput) {
  return db.transaction(async (tx) => {
    await assertCodeFree(tx, "laboratory", input.code);
    const [created] = await tx
      .insert(laboratory)
      .values({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "laboratory",
      entityId: created.id,
      after: { code: created.code, name: created.name },
    });
    return created;
  });
}

export async function updateLaboratory(
  actorId: string,
  id: string,
  input: Update<LaboratoryInput>,
) {
  return db.transaction(async (tx) => {
    const current = await requireRow(
      async () =>
        (
          await tx.select().from(laboratory).where(eq(laboratory.id, id)).limit(1)
        )[0],
      "Laboratory not found.",
    );
    if (input.code && input.code !== current.code)
      await assertCodeFree(tx, "laboratory", input.code, id);
    const [updated] = await tx
      .update(laboratory)
      .set({
        code: input.code ?? current.code,
        name: input.name ?? current.name,
        description:
          input.description === undefined
            ? current.description
            : input.description,
        active: input.active ?? current.active,
      })
      .where(eq(laboratory.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "laboratory",
      entityId: id,
      before: { code: current.code, name: current.name, active: current.active },
      after: { code: updated.code, name: updated.name, active: updated.active },
    });
    return updated;
  });
}

// ------------------------------------------------------------------------ rooms

export async function listRoomsAdmin() {
  return db
    .select({
      id: room.id,
      code: room.code,
      name: room.name,
      shortName: room.shortName,
      description: room.description,
      floor: room.floor,
      tone: room.tone,
      active: room.active,
      laboratoryCode: laboratory.code,
      laboratoryName: laboratory.name,
    })
    .from(room)
    .innerJoin(laboratory, eq(laboratory.id, room.laboratoryId))
    .orderBy(asc(room.code));
}

export async function createRoom(actorId: string, input: RoomInput) {
  return db.transaction(async (tx) => {
    const lab = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(laboratory)
            .where(eq(laboratory.code, input.laboratoryCode))
            .limit(1)
        )[0],
      "Laboratory not found.",
    );
    await assertCodeFree(tx, "room", input.code);
    const [created] = await tx
      .insert(room)
      .values({
        laboratoryId: lab.id,
        code: input.code,
        name: input.name,
        shortName: input.shortName,
        description: input.description ?? null,
        floor: input.floor ?? null,
        tone: input.tone ?? "cream",
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "room",
      entityId: created.id,
      after: { code: created.code, laboratory: lab.code },
    });
    return created;
  });
}

export async function updateRoom(
  actorId: string,
  id: string,
  input: Update<RoomInput>,
) {
  return db.transaction(async (tx) => {
    const current = await requireRow(
      async () => (await tx.select().from(room).where(eq(room.id, id)).limit(1))[0],
      "Room not found.",
    );
    if (input.code && input.code !== current.code)
      await assertCodeFree(tx, "room", input.code, id);
    let laboratoryId = current.laboratoryId;
    const laboratoryCode = input.laboratoryCode;
    if (laboratoryCode) {
      const lab = await requireRow(
        async () =>
          (
            await tx
              .select()
              .from(laboratory)
              .where(eq(laboratory.code, laboratoryCode))
              .limit(1)
          )[0],
        "Laboratory not found.",
      );
      laboratoryId = lab.id;
    }
    const [updated] = await tx
      .update(room)
      .set({
        laboratoryId,
        code: input.code ?? current.code,
        name: input.name ?? current.name,
        shortName: input.shortName ?? current.shortName,
        description:
          input.description === undefined
            ? current.description
            : input.description,
        floor: input.floor === undefined ? current.floor : input.floor,
        tone: input.tone ?? current.tone,
        active: input.active ?? current.active,
      })
      .where(eq(room.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "room",
      entityId: id,
      before: { code: current.code, name: current.name, active: current.active },
      after: { code: updated.code, name: updated.name, active: updated.active },
    });
    return updated;
  });
}

// -------------------------------------------------------------- equipment / instrument / tool types

export async function listEquipmentTypes() {
  const [instruments, tools] = await Promise.all([
    db
      .select({
        id: instrumentType.id,
        name: instrumentType.name,
        category: instrumentType.category,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
        description: instrumentType.description,
        usageType: instrumentType.usageType,
        imageMediaId: instrumentType.imageMediaId,
        active: instrumentType.active,
        createdAt: instrumentType.createdAt,
        updatedAt: instrumentType.updatedAt,
      })
      .from(instrumentType)
      .orderBy(asc(instrumentType.name)),
    db
      .select({
        id: toolType.id,
        name: toolType.name,
        category: toolType.category,
        classification: sql<"TOOL">`'TOOL'`,
        description: toolType.description,
        usageType: toolType.usageType,
        imageMediaId: toolType.imageMediaId,
        active: toolType.active,
        createdAt: toolType.createdAt,
        updatedAt: toolType.updatedAt,
      })
      .from(toolType)
      .orderBy(asc(toolType.name)),
  ]);
  return [...instruments, ...tools].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createEquipmentType(
  actorId: string,
  input: EquipmentTypeInput,
) {
  const isTool = input.classification === "TOOL";
  return db.transaction(async (tx) => {
    if (isTool) {
      const [created] = await tx
        .insert(toolType)
        .values({
          name: input.name,
          category: input.category ?? null,
          description: input.description ?? null,
          usageType: input.usageType,
          imageMediaId: input.imageMediaId ?? null,
          active: input.active ?? true,
        })
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "tool_type",
        entityId: created.id,
        after: {
          name: created.name,
          usageType: created.usageType,
          classification: "TOOL",
        },
      });
      return { ...created, classification: "TOOL" as const };
    }

    const [created] = await tx
      .insert(instrumentType)
      .values({
        name: input.name,
        category: input.category ?? null,
        description: input.description ?? null,
        usageType: input.usageType,
        imageMediaId: input.imageMediaId ?? null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "instrument_type",
      entityId: created.id,
      after: {
        name: created.name,
        usageType: created.usageType,
        classification: "INSTRUMENT",
      },
    });
    return { ...created, classification: "INSTRUMENT" as const };
  });
}

export async function updateEquipmentType(
  actorId: string,
  id: string,
  input: Update<EquipmentTypeInput>,
) {
  return db.transaction(async (tx) => {
    const [inst] = await tx
      .select()
      .from(instrumentType)
      .where(eq(instrumentType.id, id))
      .limit(1);

    if (inst) {
      const [updated] = await tx
        .update(instrumentType)
        .set({
          name: input.name ?? inst.name,
          category: input.category === undefined ? inst.category : input.category,
          description:
            input.description === undefined ? inst.description : input.description,
          usageType: input.usageType ?? inst.usageType,
          imageMediaId:
            input.imageMediaId === undefined
              ? inst.imageMediaId
              : input.imageMediaId,
          active: input.active ?? inst.active,
        })
        .where(eq(instrumentType.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "instrument_type",
        entityId: id,
        before: {
          name: inst.name,
          usageType: inst.usageType,
          classification: "INSTRUMENT",
        },
        after: {
          name: updated.name,
          usageType: updated.usageType,
          classification: "INSTRUMENT",
        },
      });
      return { ...updated, classification: "INSTRUMENT" as const };
    }

    const tool = await requireRow(
      async () =>
        (
          await tx.select().from(toolType).where(eq(toolType.id, id)).limit(1)
        )[0],
      "Equipment type not found.",
    );

    const [updated] = await tx
      .update(toolType)
      .set({
        name: input.name ?? tool.name,
        category: input.category === undefined ? tool.category : input.category,
        description:
          input.description === undefined ? tool.description : input.description,
        usageType: input.usageType ?? tool.usageType,
        imageMediaId:
          input.imageMediaId === undefined
            ? tool.imageMediaId
            : input.imageMediaId,
        active: input.active ?? tool.active,
      })
      .where(eq(toolType.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "tool_type",
      entityId: id,
      before: {
        name: tool.name,
        usageType: tool.usageType,
        classification: "TOOL",
      },
      after: {
        name: updated.name,
        usageType: updated.usageType,
        classification: "TOOL",
      },
    });
    return { ...updated, classification: "TOOL" as const };
  });
}

// -------------------------------------------------------------- equipment / instrument / tool assets

export async function listEquipmentAssetsAdmin() {
  const [instAssets, toolAssetsList] = await Promise.all([
    db
      .select({
        id: instrumentAsset.id,
        assetCode: instrumentAsset.assetCode,
        serialNumber: instrumentAsset.serialNumber,
        status: instrumentAsset.status,
        condition: instrumentAsset.condition,
        notes: instrumentAsset.notes,
        active: instrumentAsset.active,
        equipmentTypeId: instrumentAsset.instrumentTypeId,
        typeName: instrumentType.name,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
        usageType: instrumentType.usageType,
        roomCode: room.code,
        roomName: room.name,
        unitCount: sql<number>`(SELECT count(*)::int FROM instrument_unit u WHERE u.instrument_asset_id = ${instrumentAsset.id} AND u.active = true)`,
        assetImageMediaId: instrumentAsset.imageMediaId,
        typeImageMediaId: instrumentType.imageMediaId,
        imageMediaId: sql<string | null>`COALESCE(${instrumentAsset.imageMediaId}, ${instrumentType.imageMediaId})`,
      })
      .from(instrumentAsset)
      .innerJoin(
        instrumentType,
        eq(instrumentType.id, instrumentAsset.instrumentTypeId),
      )
      .innerJoin(room, eq(room.id, instrumentAsset.roomId))
      .where(eq(instrumentAsset.active, true)),
    db
      .select({
        id: toolAsset.id,
        assetCode: toolAsset.assetCode,
        serialNumber: toolAsset.serialNumber,
        status: toolAsset.status,
        condition: toolAsset.condition,
        notes: toolAsset.notes,
        active: toolAsset.active,
        equipmentTypeId: toolAsset.toolTypeId,
        typeName: toolType.name,
        classification: sql<"TOOL">`'TOOL'`,
        usageType: toolType.usageType,
        roomCode: room.code,
        roomName: room.name,
        unitCount: sql<number>`(SELECT count(*)::int FROM tool_unit u WHERE u.tool_asset_id = ${toolAsset.id} AND u.active = true)`,
        assetImageMediaId: toolAsset.imageMediaId,
        typeImageMediaId: toolType.imageMediaId,
        imageMediaId: sql<string | null>`COALESCE(${toolAsset.imageMediaId}, ${toolType.imageMediaId})`,
      })
      .from(toolAsset)
      .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
      .innerJoin(room, eq(room.id, toolAsset.roomId))
      .where(eq(toolAsset.active, true)),
  ]);

  const [instUnits, toolUnitsList] = await Promise.all([
    db
      .select({
        id: instrumentUnit.id,
        code: instrumentUnit.code,
        label: instrumentUnit.label,
        status: instrumentUnit.status,
        condition: instrumentUnit.condition,
        notes: instrumentUnit.notes,
        equipmentAssetId: instrumentUnit.instrumentAssetId,
      })
      .from(instrumentUnit)
      .where(eq(instrumentUnit.active, true))
      .orderBy(asc(instrumentUnit.code)),
    db
      .select({
        id: toolUnit.id,
        code: toolUnit.code,
        label: toolUnit.label,
        status: toolUnit.status,
        condition: toolUnit.condition,
        notes: toolUnit.notes,
        equipmentAssetId: toolUnit.toolAssetId,
      })
      .from(toolUnit)
      .where(eq(toolUnit.active, true))
      .orderBy(asc(toolUnit.code)),
  ]);

  const allUnits = [...instUnits, ...toolUnitsList];
  const unitsByAsset = new Map<string, typeof allUnits>();
  for (const unit of allUnits) {
    const list = unitsByAsset.get(unit.equipmentAssetId) ?? [];
    list.push(unit);
    unitsByAsset.set(unit.equipmentAssetId, list);
  }

  const allAssets = [...instAssets, ...toolAssetsList].sort((a, b) =>
    a.roomName.localeCompare(b.roomName) || a.assetCode.localeCompare(b.assetCode),
  );

  return allAssets.map((asset) => ({
    ...asset,
    units: unitsByAsset.get(asset.id) ?? [],
  }));
}

export async function createEquipmentAsset(
  actorId: string,
  input: EquipmentAssetInput,
) {
  return db.transaction(async (tx) => {
    const roomRow = await requireRow(
      async () =>
        (
          await tx.select().from(room).where(eq(room.code, input.roomCode)).limit(1)
        )[0],
      "Room not found.",
    );
    await assertCodeFree(tx, "equipment_asset", input.assetCode);

    const [instType] = await tx
      .select()
      .from(instrumentType)
      .where(eq(instrumentType.id, input.equipmentTypeId))
      .limit(1);

    if (instType) {
      const [created] = await tx
        .insert(instrumentAsset)
        .values({
          instrumentTypeId: instType.id,
          roomId: roomRow.id,
          assetCode: input.assetCode,
          serialNumber: input.serialNumber ? input.serialNumber.trim() : null,
          status: input.status ?? "AVAILABLE",
          condition: input.condition ?? "GOOD",
          notes: input.notes ? input.notes.trim() : null,
          active: input.active ?? true,
        })
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "instrument_asset",
        entityId: created.id,
        after: { assetCode: created.assetCode, room: roomRow.code },
      });
      return created;
    }

    const toolTypeRow = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(toolType)
            .where(eq(toolType.id, input.equipmentTypeId))
            .limit(1)
        )[0],
      "Equipment type not found.",
    );

    const [created] = await tx
      .insert(toolAsset)
      .values({
        toolTypeId: toolTypeRow.id,
        roomId: roomRow.id,
        assetCode: input.assetCode,
        serialNumber: input.serialNumber ? input.serialNumber.trim() : null,
        status: input.status ?? "AVAILABLE",
        condition: input.condition ?? "GOOD",
        notes: input.notes ? input.notes.trim() : null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "tool_asset",
      entityId: created.id,
      after: { assetCode: created.assetCode, room: roomRow.code },
    });
    return created;
  });
}

export async function updateEquipmentAsset(
  actorId: string,
  id: string,
  input: Update<EquipmentAssetInput>,
) {
  return db.transaction(async (tx) => {
    const [instCurrent] = await tx
      .select()
      .from(instrumentAsset)
      .where(eq(instrumentAsset.id, id))
      .limit(1);

    if (instCurrent) {
      if (input.assetCode && input.assetCode !== instCurrent.assetCode)
        await assertCodeFree(tx, "instrument_asset", input.assetCode, id);
      let roomId = instCurrent.roomId;
      const roomCode = input.roomCode;
      if (roomCode) {
        const roomRow = await requireRow(
          async () =>
            (
              await tx.select().from(room).where(eq(room.code, roomCode)).limit(1)
            )[0],
          "Room not found.",
        );
        roomId = roomRow.id;
      }
      const [updated] = await tx
        .update(instrumentAsset)
        .set({
          instrumentTypeId:
            input.equipmentTypeId ?? instCurrent.instrumentTypeId,
          roomId,
          assetCode: input.assetCode ?? instCurrent.assetCode,
          serialNumber:
            input.serialNumber === undefined
              ? instCurrent.serialNumber
              : input.serialNumber
                ? input.serialNumber.trim()
                : null,
          status: input.status ?? instCurrent.status,
          condition: input.condition ?? instCurrent.condition,
          notes:
            input.notes === undefined
              ? instCurrent.notes
              : input.notes
                ? input.notes.trim()
                : null,
          active: input.active ?? instCurrent.active,
        })
        .where(eq(instrumentAsset.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "instrument_asset",
        entityId: id,
        before: {
          status: instCurrent.status,
          condition: instCurrent.condition,
        },
        after: { status: updated.status, condition: updated.condition },
      });
      return updated;
    }

    const toolCurrent = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(toolAsset)
            .where(eq(toolAsset.id, id))
            .limit(1)
        )[0],
      "Equipment asset not found.",
    );

    if (input.assetCode && input.assetCode !== toolCurrent.assetCode)
      await assertCodeFree(tx, "tool_asset", input.assetCode, id);
    let roomId = toolCurrent.roomId;
    const roomCode = input.roomCode;
    if (roomCode) {
      const roomRow = await requireRow(
        async () =>
          (
            await tx.select().from(room).where(eq(room.code, roomCode)).limit(1)
          )[0],
        "Room not found.",
      );
      roomId = roomRow.id;
    }
    const [updated] = await tx
      .update(toolAsset)
      .set({
        toolTypeId: input.equipmentTypeId ?? toolCurrent.toolTypeId,
        roomId,
        assetCode: input.assetCode ?? toolCurrent.assetCode,
        serialNumber:
          input.serialNumber === undefined
            ? toolCurrent.serialNumber
            : input.serialNumber
              ? input.serialNumber.trim()
              : null,
        status: input.status ?? toolCurrent.status,
        condition: input.condition ?? toolCurrent.condition,
        notes:
          input.notes === undefined
            ? toolCurrent.notes
            : input.notes
              ? input.notes.trim()
              : null,
        active: input.active ?? toolCurrent.active,
      })
      .where(eq(toolAsset.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "tool_asset",
      entityId: id,
      before: {
        status: toolCurrent.status,
        condition: toolCurrent.condition,
      },
      after: { status: updated.status, condition: updated.condition },
    });
    return updated;
  });
}

// --------------------------------------------------------------- equipment / instrument / tool units

export async function listEquipmentUnitsAdmin(assetCode?: string) {
  const [instUnits, toolUnitsList] = await Promise.all([
    db
      .select({
        id: instrumentUnit.id,
        code: instrumentUnit.code,
        label: instrumentUnit.label,
        qrCode: instrumentUnit.qrCode,
        storageLocation: instrumentUnit.storageLocation,
        status: instrumentUnit.status,
        condition: instrumentUnit.condition,
        notes: instrumentUnit.notes,
        active: instrumentUnit.active,
        assetCode: instrumentAsset.assetCode,
        assetName: instrumentType.name,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
      })
      .from(instrumentUnit)
      .innerJoin(
        instrumentAsset,
        eq(instrumentAsset.id, instrumentUnit.instrumentAssetId),
      )
      .innerJoin(
        instrumentType,
        eq(instrumentType.id, instrumentAsset.instrumentTypeId),
      )
      .where(assetCode ? eq(instrumentAsset.assetCode, assetCode) : undefined),
    db
      .select({
        id: toolUnit.id,
        code: toolUnit.code,
        label: toolUnit.label,
        qrCode: toolUnit.qrCode,
        storageLocation: toolUnit.storageLocation,
        status: toolUnit.status,
        condition: toolUnit.condition,
        notes: toolUnit.notes,
        active: toolUnit.active,
        assetCode: toolAsset.assetCode,
        assetName: toolType.name,
        classification: sql<"TOOL">`'TOOL'`,
      })
      .from(toolUnit)
      .innerJoin(toolAsset, eq(toolAsset.id, toolUnit.toolAssetId))
      .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
      .where(assetCode ? eq(toolAsset.assetCode, assetCode) : undefined),
  ]);

  return [...instUnits, ...toolUnitsList].sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

export async function createEquipmentUnit(
  actorId: string,
  input: EquipmentUnitInput,
) {
  return db.transaction(async (tx) => {
    await assertCodeFree(tx, "equipment_unit", input.code);

    const [instAsset] = await tx
      .select()
      .from(instrumentAsset)
      .where(eq(instrumentAsset.assetCode, input.assetCode))
      .limit(1);

    if (instAsset) {
      const [created] = await tx
        .insert(instrumentUnit)
        .values({
          instrumentAssetId: instAsset.id,
          code: input.code,
          label: input.label,
          qrCode: `RK-INS-${input.code}`,
          storageLocation: input.storageLocation
            ? input.storageLocation.trim()
            : null,
          status: input.status ?? "AVAILABLE",
          condition: input.condition ?? "GOOD",
          notes: input.notes ? input.notes.trim() : null,
          active: input.active ?? true,
        })
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "instrument_unit",
        entityId: created.id,
        after: { code: created.code, asset: instAsset.assetCode },
      });
      return created;
    }

    const toolAssetRow = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(toolAsset)
            .where(eq(toolAsset.assetCode, input.assetCode))
            .limit(1)
        )[0],
      "Equipment asset not found.",
    );

    const [created] = await tx
      .insert(toolUnit)
      .values({
        toolAssetId: toolAssetRow.id,
        code: input.code,
        label: input.label,
        qrCode: `RK-TOL-${input.code}`,
        storageLocation: input.storageLocation
          ? input.storageLocation.trim()
          : null,
        status: input.status ?? "AVAILABLE",
        condition: input.condition ?? "GOOD",
        notes: input.notes ? input.notes.trim() : null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "tool_unit",
      entityId: created.id,
      after: { code: created.code, asset: toolAssetRow.assetCode },
    });
    return created;
  });
}

export async function updateEquipmentUnit(
  actorId: string,
  id: string,
  input: Update<EquipmentUnitInput>,
) {
  return db.transaction(async (tx) => {
    const [instUnit] = await tx
      .select()
      .from(instrumentUnit)
      .where(eq(instrumentUnit.id, id))
      .limit(1);

    if (instUnit) {
      if (input.code && input.code !== instUnit.code)
        await assertCodeFree(tx, "instrument_unit", input.code, id);
      const [updated] = await tx
        .update(instrumentUnit)
        .set({
          code: input.code ?? instUnit.code,
          label: input.label ?? instUnit.label,
          storageLocation:
            input.storageLocation === undefined
              ? instUnit.storageLocation
              : input.storageLocation
                ? input.storageLocation.trim()
                : null,
          status: input.status ?? instUnit.status,
          condition: input.condition ?? instUnit.condition,
          notes:
            input.notes === undefined
              ? instUnit.notes
              : input.notes
                ? input.notes.trim()
                : null,
          active: input.active ?? instUnit.active,
        })
        .where(eq(instrumentUnit.id, id))
        .returning();

      if (input.status && input.status !== instUnit.status) {
        const activeUnits = await tx
          .select({ status: instrumentUnit.status })
          .from(instrumentUnit)
          .where(
            and(
              eq(instrumentUnit.instrumentAssetId, instUnit.instrumentAssetId),
              eq(instrumentUnit.active, true),
            ),
          );
        const hasAvailable = activeUnits.some((u) => u.status === "AVAILABLE");
        const allMaintenance =
          activeUnits.length > 0 &&
          activeUnits.every((u) =>
            ["MAINTENANCE", "DAMAGED", "RETIRED"].includes(u.status),
          );
        if (hasAvailable) {
          await tx
            .update(instrumentAsset)
            .set({ status: "AVAILABLE" })
            .where(eq(instrumentAsset.id, instUnit.instrumentAssetId));
        } else if (allMaintenance) {
          await tx
            .update(instrumentAsset)
            .set({ status: "MAINTENANCE" })
            .where(eq(instrumentAsset.id, instUnit.instrumentAssetId));
        }
      }

      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "instrument_unit",
        entityId: id,
        before: {
          status: instUnit.status,
          condition: instUnit.condition,
          active: instUnit.active,
        },
        after: {
          status: updated.status,
          condition: updated.condition,
          active: updated.active,
        },
      });
      return updated;
    }

    const toolUnitRow = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(toolUnit)
            .where(eq(toolUnit.id, id))
            .limit(1)
        )[0],
      "Equipment unit not found.",
    );

    if (input.code && input.code !== toolUnitRow.code)
      await assertCodeFree(tx, "tool_unit", input.code, id);
    const [updated] = await tx
      .update(toolUnit)
      .set({
        code: input.code ?? toolUnitRow.code,
        label: input.label ?? toolUnitRow.label,
        storageLocation:
          input.storageLocation === undefined
            ? toolUnitRow.storageLocation
            : input.storageLocation
              ? input.storageLocation.trim()
              : null,
        status: input.status ?? toolUnitRow.status,
        condition: input.condition ?? toolUnitRow.condition,
        notes:
          input.notes === undefined
            ? toolUnitRow.notes
            : input.notes
              ? input.notes.trim()
              : null,
        active: input.active ?? toolUnitRow.active,
      })
      .where(eq(toolUnit.id, id))
      .returning();

    if (input.status && input.status !== toolUnitRow.status) {
      const activeUnits = await tx
        .select({ status: toolUnit.status })
        .from(toolUnit)
        .where(
          and(
            eq(toolUnit.toolAssetId, toolUnitRow.toolAssetId),
            eq(toolUnit.active, true),
          ),
        );
      const hasAvailable = activeUnits.some((u) => u.status === "AVAILABLE");
      const allMaintenance =
        activeUnits.length > 0 &&
        activeUnits.every((u) =>
          ["MAINTENANCE", "DAMAGED", "RETIRED"].includes(u.status),
        );
      if (hasAvailable) {
        await tx
          .update(toolAsset)
          .set({ status: "AVAILABLE" })
          .where(eq(toolAsset.id, toolUnitRow.toolAssetId));
      } else if (allMaintenance) {
        await tx
          .update(toolAsset)
          .set({ status: "MAINTENANCE" })
          .where(eq(toolAsset.id, toolUnitRow.toolAssetId));
      }
    }

    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "tool_unit",
      entityId: id,
      before: {
        status: toolUnitRow.status,
        condition: toolUnitRow.condition,
        active: toolUnitRow.active,
      },
      after: {
        status: updated.status,
        condition: updated.condition,
        active: updated.active,
      },
    });
    return updated;
  });
}

// -------------------------------------------------------------------- materials

export async function listMaterialsAdmin() {
  return db
    .select({
      id: material.id,
      code: material.code,
      name: material.name,
      category: material.category,
      baseUnit: material.baseUnit,
      description: material.description,
      imageMediaId: material.imageMediaId,
      active: material.active,
      minimumQuantity: materialDispensingRule.minimumQuantity,
      dispensingIncrement: materialDispensingRule.dispensingIncrement,
      maximumQuantity: materialDispensingRule.maximumQuantity,
      ruleUnit: materialDispensingRule.unit,
      ruleActive: materialDispensingRule.active,
      batchCount: sql<number>`(SELECT count(*)::int FROM material_batch b WHERE b.material_id = ${material.id} AND b.active)`,
      physical: sql<string>`COALESCE((SELECT SUM(b.quantity) FROM material_batch b WHERE b.material_id = ${material.id} AND b.active), 0)`,
    })
    .from(material)
    .leftJoin(
      materialDispensingRule,
      eq(materialDispensingRule.materialId, material.id),
    )
    .orderBy(asc(material.name));
}

export async function createMaterial(actorId: string, input: MaterialInput) {
  return db.transaction(async (tx) => {
    await assertCodeFree(tx, "material", input.code);
    const [created] = await tx
      .insert(material)
      .values({
        code: input.code,
        name: input.name,
        category: input.category ?? null,
        baseUnit: input.baseUnit,
        description: input.description ?? null,
        imageMediaId: input.imageMediaId ?? null,
        active: input.active ?? true,
      })
      .returning();
    if (input.rule) {
      await tx.insert(materialDispensingRule).values({
        materialId: created.id,
        minimumQuantity: input.rule.minimumQuantity.toFixed(3),
        dispensingIncrement: input.rule.dispensingIncrement.toFixed(3),
        maximumQuantity: input.rule.maximumQuantity.toFixed(3),
        unit: input.rule.unit,
        active: input.rule.active ?? true,
      });
    }
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "material",
      entityId: created.id,
      after: { code: created.code, name: created.name },
    });
    return created;
  });
}

export async function updateMaterial(
  actorId: string,
  id: string,
  input: Update<MaterialInput>,
) {
  return db.transaction(async (tx) => {
    const current = await requireRow(
      async () =>
        (
          await tx.select().from(material).where(eq(material.id, id)).limit(1)
        )[0],
      "Material not found.",
    );
    if (input.code && input.code !== current.code)
      await assertCodeFree(tx, "material", input.code, id);
    const [updated] = await tx
      .update(material)
      .set({
        code: input.code ?? current.code,
        name: input.name ?? current.name,
        category: input.category === undefined ? current.category : input.category,
        baseUnit: input.baseUnit ?? current.baseUnit,
        description:
          input.description === undefined
            ? current.description
            : input.description,
        imageMediaId:
          input.imageMediaId === undefined
            ? current.imageMediaId
            : input.imageMediaId,
        active: input.active ?? current.active,
      })
      .where(eq(material.id, id))
      .returning();
    if (input.rule) {
      await tx
        .insert(materialDispensingRule)
        .values({
          materialId: id,
          minimumQuantity: input.rule.minimumQuantity.toFixed(3),
          dispensingIncrement: input.rule.dispensingIncrement.toFixed(3),
          maximumQuantity: input.rule.maximumQuantity.toFixed(3),
          unit: input.rule.unit,
          active: input.rule.active ?? true,
        })
        .onConflictDoUpdate({
          target: materialDispensingRule.materialId,
          set: {
            minimumQuantity: input.rule.minimumQuantity.toFixed(3),
            dispensingIncrement: input.rule.dispensingIncrement.toFixed(3),
            maximumQuantity: input.rule.maximumQuantity.toFixed(3),
            unit: input.rule.unit,
            active: input.rule.active ?? true,
          },
        });
    }
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "material",
      entityId: id,
      before: { code: current.code, active: current.active },
      after: { code: updated.code, active: updated.active },
    });
    return updated;
  });
}

// ---------------------------------------------------------------------- batches

export async function listBatchesAdmin(materialCode?: string) {
  return db
    .select({
      id: materialBatch.id,
      lotNumber: materialBatch.lotNumber,
      qrCode: materialBatch.qrCode,
      storageLocation: materialBatch.storageLocation,
      quantity: materialBatch.quantity,
      expiryDate: materialBatch.expiryDate,
      receivedDate: materialBatch.receivedDate,
      active: materialBatch.active,
      materialCode: material.code,
      materialName: material.name,
      imageMediaId: material.imageMediaId,
      unit: material.baseUnit,
      roomCode: room.code,
      roomName: room.name,
    })
    .from(materialBatch)
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(room, eq(room.id, materialBatch.roomId))
    .where(materialCode ? eq(material.code, materialCode) : undefined)
    .orderBy(asc(material.name), asc(materialBatch.expiryDate));
}

export async function createMaterialBatch(
  actorId: string,
  input: MaterialBatchInput,
) {
  return db.transaction(async (tx) => {
    const materialRow = await requireRow(
      async () =>
        (
          await tx.select().from(material).where(eq(material.code, input.materialCode)).limit(1)
        )[0],
      "Material not found.",
    );
    const roomRow = await requireRow(
      async () =>
        (
          await tx.select().from(room).where(eq(room.code, input.roomCode)).limit(1)
        )[0],
      "Room not found.",
    );
    const lotPart = input.lotNumber ?? Date.now().toString(36).slice(-6).toUpperCase();
    const qrCode = `RK-MAT-${lotPart}`;
    const [created] = await tx
      .insert(materialBatch)
      .values({
        materialId: materialRow.id,
        roomId: roomRow.id,
        lotNumber: input.lotNumber ?? null,
        qrCode,
        storageLocation: input.storageLocation ? input.storageLocation.trim() : null,
        quantity: input.quantity.toFixed(3),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        active: input.active ?? true,
      })
      .returning();
    if (input.quantity > 0) {
      await recordStockTransaction(tx, {
        batchId: created.id,
        type: "RECEIVE",
        quantity: input.quantity,
        before: 0,
        after: input.quantity,
        referenceType: "material_batch",
        referenceId: created.id,
        performedById: actorId,
        reason: "Penerimaan batch baru",
      });
    }
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "material_batch",
      entityId: created.id,
      after: {
        material: materialRow.code,
        lot: created.lotNumber,
        quantity: Number(created.quantity),
      },
    });
    return created;
  });
}

export async function updateMaterialBatch(
  actorId: string,
  id: string,
  input: Update<MaterialBatchInput>,
) {
  return db.transaction(async (tx) => {
    const current = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(materialBatch)
            .where(eq(materialBatch.id, id))
            .limit(1)
            .for("update")
        )[0],
      "Material batch not found.",
    );
    const nextQuantity = input.quantity ?? Number(current.quantity);
    const delta = nextQuantity - Number(current.quantity);
    const [updated] = await tx
      .update(materialBatch)
      .set({
        lotNumber:
          input.lotNumber === undefined ? current.lotNumber : input.lotNumber,
        storageLocation:
          input.storageLocation === undefined
            ? current.storageLocation
            : input.storageLocation
              ? input.storageLocation.trim()
              : null,
        quantity: nextQuantity.toFixed(3),
        expiryDate:
          input.expiryDate === undefined
            ? current.expiryDate
            : input.expiryDate
              ? new Date(input.expiryDate)
              : null,
        active: input.active ?? current.active,
      })
      .where(eq(materialBatch.id, id))
      .returning();
    if (Math.abs(delta) > 1e-9) {
      await recordStockTransaction(tx, {
        batchId: id,
        type: "ADJUST",
        quantity: Math.abs(delta),
        before: Number(current.quantity),
        after: nextQuantity,
        referenceType: "material_batch",
        referenceId: id,
        performedById: actorId,
        reason: delta > 0 ? "Penambahan stok manual" : "Pengurangan stok manual",
      });
    }
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "material_batch",
      entityId: id,
      before: { quantity: Number(current.quantity), active: current.active },
      after: { quantity: nextQuantity, active: updated.active },
    });
    return updated;
  });
}

// ------------------------------------------------------------------ assignments

const assignmentTypeRoles: Record<string, string[]> = {
  PLP: ["plp", "admin"],
  PIC: ["plp", "admin"],
};

async function assertAssignmentScope(
  exec: DbExecutor,
  scopeType: string,
  scopeId: string,
) {
  if (scopeType === "LABORATORY") {
    const [row] = await exec
      .select({ id: laboratory.id })
      .from(laboratory)
      .where(and(eq(laboratory.code, scopeId), eq(laboratory.active, true)))
      .limit(1);
    if (!row)
      throw new ApiError(
        400,
        "INVALID_SCOPE",
        "Laboratory tidak ditemukan atau tidak aktif.",
      );
    return;
  }
  if (scopeType === "ROOM") {
    const [row] = await exec
      .select({ id: room.id })
      .from(room)
      .where(and(eq(room.code, scopeId), eq(room.active, true)))
      .limit(1);
    if (!row)
      throw new ApiError(
        400,
        "INVALID_SCOPE",
        "Room tidak ditemukan atau tidak aktif.",
      );
    return;
  }
  const [row] = await exec
    .select({ id: activity.id })
    .from(activity)
    .where(sql`${activity.id}::text = ${scopeId}`)
    .limit(1);
  if (!row)
    throw new ApiError(400, "INVALID_SCOPE", "Activity tidak ditemukan.");
}

function assertAssignmentRoles(memberRole: string, assignmentType: string) {
  const allowed = assignmentTypeRoles[assignmentType] ?? [];
  const roles = memberRole
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  if (!roles.some((role) => allowed.includes(role))) {
    throw new ApiError(
      400,
      "INVALID_ROLE",
      `Tipe ${assignmentType} memerlukan role ${allowed.join(" atau ")}.`,
    );
  }
}

async function assertAssignmentRules(
  exec: DbExecutor,
  input: {
    userId: string;
    scopeType: string;
    scopeId: string;
    assignmentType: string;
    startDate?: Date | null;
    endDate?: Date | null;
    excludeId?: string;
  },
) {
  const member = await requireRow(
    async () =>
      (await exec.select().from(user).where(eq(user.id, input.userId)).limit(1))[0],
    "User not found.",
  );
  assertAssignmentRoles(member.role ?? "", input.assignmentType);
  await assertAssignmentScope(exec, input.scopeType, input.scopeId);
  if (
    input.startDate &&
    input.endDate &&
    input.endDate.getTime() < input.startDate.getTime()
  ) {
    throw new ApiError(
      400,
      "INVALID_PERIOD",
      "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    );
  }
  const duplicate = await exec
    .select({ id: assignment.id })
    .from(assignment)
    .where(
      and(
        eq(assignment.userId, input.userId),
        eq(assignment.scopeType, input.scopeType as "LABORATORY" | "ROOM" | "ACTIVITY"),
        eq(assignment.scopeId, input.scopeId),
        eq(
          assignment.assignmentType,
          input.assignmentType as "PLP" | "PIC",
        ),
        eq(assignment.active, true),
        input.excludeId ? ne(assignment.id, input.excludeId) : undefined,
      ),
    )
    .limit(1);
  if (duplicate.length > 0) {
    throw new ApiError(
      409,
      "DUPLICATE_ASSIGNMENT",
      "Assignment aktif dengan user, tipe, dan scope yang sama sudah ada.",
    );
  }
  return member;
}

export async function listActivityOptions() {
  return db
    .select({
      id: activity.id,
      title: activity.title,
      status: activity.status,
      studentName: user.name,
    })
    .from(activity)
    .innerJoin(user, eq(user.id, activity.studentId))
    .orderBy(desc(activity.createdAt));
}

export async function listAssignments() {
  return db
    .select({
      id: assignment.id,
      userId: assignment.userId,
      userName: user.name,
      userEmail: user.email,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId,
      scopeLabel: sql<string>`CASE ${assignment.scopeType}
        WHEN 'LABORATORY' THEN COALESCE((SELECT name FROM laboratory WHERE code = ${assignment.scopeId}), ${assignment.scopeId})
        WHEN 'ROOM' THEN COALESCE((SELECT name FROM room WHERE code = ${assignment.scopeId}), ${assignment.scopeId})
        ELSE COALESCE((SELECT title FROM activity WHERE id::text = ${assignment.scopeId}), ${assignment.scopeId})
      END`,
      assignmentType: assignment.assignmentType,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      notes: assignment.notes,
      active: assignment.active,
    })
    .from(assignment)
    .innerJoin(user, eq(user.id, assignment.userId))
    .orderBy(asc(user.name));
}

export async function createAssignment(actorId: string, input: AssignmentInput) {
  const created = await db.transaction(async (tx) => {
    const member = await assertAssignmentRules(tx, {
      userId: input.userId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      assignmentType: input.assignmentType,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    });
    const [created] = await tx
      .insert(assignment)
      .values({
        userId: input.userId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        assignmentType: input.assignmentType,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        notes: input.notes ?? null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "assignment",
      entityId: created.id,
      after: {
        user: member.email,
        scope: `${input.scopeType}:${input.scopeId}`,
        type: input.assignmentType,
      },
    });
    return created;
  });
  invalidateRoomScope(input.userId);
  return created;
}

export async function updateAssignment(
  actorId: string,
  id: string,
  input: Update<AssignmentInput>,
) {
  const updated = await db.transaction(async (tx) => {
    const current = await requireRow(
      async () =>
        (
          await tx.select().from(assignment).where(eq(assignment.id, id)).limit(1)
        )[0],
      "Assignment not found.",
    );
    const nextStart =
      input.startDate === undefined
        ? current.startDate
        : input.startDate
          ? new Date(input.startDate)
          : null;
    const nextEnd =
      input.endDate === undefined
        ? current.endDate
        : input.endDate
          ? new Date(input.endDate)
          : null;
    await assertAssignmentRules(tx, {
      userId: input.userId ?? current.userId,
      scopeType: input.scopeType ?? current.scopeType,
      scopeId: input.scopeId ?? current.scopeId,
      assignmentType: input.assignmentType ?? current.assignmentType,
      startDate: nextStart,
      endDate: nextEnd,
      excludeId: id,
    });
    const [updated] = await tx
      .update(assignment)
      .set({
        scopeType: input.scopeType ?? current.scopeType,
        scopeId: input.scopeId ?? current.scopeId,
        assignmentType: input.assignmentType ?? current.assignmentType,
        startDate: nextStart,
        endDate: nextEnd,
        notes: input.notes === undefined ? current.notes : input.notes,
        active: input.active ?? current.active,
      })
      .where(eq(assignment.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "assignment",
      entityId: id,
      before: {
        scope: `${current.scopeType}:${current.scopeId}`,
        active: current.active,
      },
      after: {
        scope: `${updated.scopeType}:${updated.scopeId}`,
        active: updated.active,
      },
    });
    return updated;
  });
  invalidateRoomScope(updated.userId);
  return updated;
}

// --------------------------------------------------------------- user roles

// Better Auth owns the role column through its admin plugin; this keeps the
// audit trail even though the mutation happens in the plugin endpoint.
export async function writeRoleAudit(
  actorId: string,
  targetUserId: string,
  role: string,
  previousRole: string,
) {
  await writeAudit(db, {
    actorId,
    action: "UPDATE",
    entityType: "user",
    entityId: targetUserId,
    before: { role: previousRole },
    after: { role },
  });
}

export async function deleteUserAccount(
  operatorUserId: string,
  targetUserId: string,
) {
  if (operatorUserId === targetUserId) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Tidak dapat menghapus akun Anda sendiri.",
    );
  }

  const [targetUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    throw new ApiError(404, "NOT_FOUND", "Pengguna tidak ditemukan.");
  }

  await db.transaction(async (tx) => {
    // 1. Clean up assignments for this user
    await tx.delete(assignment).where(eq(assignment.userId, targetUserId));

    // 2. Clean up user's resource requests and their child records
    // Set-based deletes keep this to a fixed number of statements no matter
    // how many requests the user owns. Item tables cascade from
    // resource_request, so only the NO ACTION children are removed here.
    const userRequestIds = sql`(SELECT id FROM resource_request WHERE student_id = ${targetUserId})`;
    const userReservationIds = sql`(SELECT id FROM reservation WHERE request_id IN ${userRequestIds} OR primary_user_id = ${targetUserId})`;
    await tx.execute(
      sql`UPDATE incident SET request_id = NULL WHERE request_id IN ${userRequestIds}`,
    );
    await tx.execute(
      sql`UPDATE incident SET reservation_id = NULL WHERE reservation_id IN ${userReservationIds}`,
    );
    await tx.execute(
      sql`DELETE FROM return_transaction WHERE issue_transaction_id IN (SELECT id FROM issue_transaction WHERE request_id IN ${userRequestIds})`,
    );
    await tx.execute(
      sql`DELETE FROM issue_transaction WHERE request_id IN ${userRequestIds}`,
    );
    await tx.execute(
      sql`DELETE FROM shared_usage_request WHERE reservation_id IN ${userReservationIds}`,
    );
    await tx.execute(
      sql`DELETE FROM shared_usage WHERE reservation_id IN ${userReservationIds}`,
    );
    await tx.execute(
      sql`DELETE FROM reservation WHERE request_id IN ${userRequestIds}`,
    );
    await tx.delete(resourceRequest).where(eq(resourceRequest.studentId, targetUserId));

    // 3. Clean up direct shared usage and reservations
    await tx.execute(
      sql`DELETE FROM shared_usage_request WHERE requester_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`DELETE FROM shared_usage WHERE user_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`DELETE FROM shared_usage_request WHERE reservation_id IN (SELECT id FROM reservation WHERE primary_user_id = ${targetUserId})`,
    );
    await tx.execute(
      sql`DELETE FROM shared_usage WHERE reservation_id IN (SELECT id FROM reservation WHERE primary_user_id = ${targetUserId})`,
    );
    await tx.execute(
      sql`DELETE FROM reservation WHERE primary_user_id = ${targetUserId}`,
    );

    // 4. Clean up activities where user is student; nullify supervisor
    await tx.execute(
      sql`DELETE FROM activity WHERE student_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE activity SET supervisor_id = NULL WHERE supervisor_id = ${targetUserId}`,
    );

    // 5. Reassign non-nullable operator/auditing references to operatorUserId
    await tx.execute(
      sql`UPDATE incident SET reporter_id = ${operatorUserId} WHERE reporter_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE incident_assessment SET assessed_by_id = ${operatorUserId} WHERE assessed_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE incident_resolution SET resolved_by_id = ${operatorUserId} WHERE resolved_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE instrument_condition_history SET recorded_by_id = ${operatorUserId} WHERE recorded_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE tool_condition_history SET recorded_by_id = ${operatorUserId} WHERE recorded_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE issue_transaction SET issued_by_id = ${operatorUserId} WHERE issued_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE issue_transaction SET issued_to_id = ${operatorUserId} WHERE issued_to_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE return_transaction SET received_by_id = ${operatorUserId} WHERE received_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE return_transaction SET returned_by_id = ${operatorUserId} WHERE returned_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE stock_transaction SET performed_by_id = ${operatorUserId} WHERE performed_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE stock_opname_session SET started_by_id = ${operatorUserId} WHERE started_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE stock_opname_entry SET counted_by_id = ${operatorUserId} WHERE counted_by_id = ${targetUserId}`,
    );

    // 6. Nullify nullable audit / operator references
    await tx.execute(
      sql`UPDATE app_setting SET updated_by_id = NULL WHERE updated_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE media SET uploaded_by_id = NULL WHERE uploaded_by_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`UPDATE stock_opname_session SET completed_by_id = NULL WHERE completed_by_id = ${targetUserId}`,
    );

    // 7. Delete user's cascading auth tables
    await tx.execute(
      sql`DELETE FROM session WHERE user_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`DELETE FROM account WHERE user_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`DELETE FROM notification WHERE recipient_id = ${targetUserId}`,
    );
    await tx.execute(
      sql`DELETE FROM notes WHERE user_id = ${targetUserId}`,
    );

    // 8. Delete the user record permanently from database
    await tx.delete(user).where(eq(user.id, targetUserId));

    // 9. Write audit record
    await writeAudit(tx, {
      actorId: operatorUserId,
      action: "DELETE",
      entityType: "user",
      entityId: targetUserId,
      before: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      reason: `Akun dihapus oleh admin (${operatorUserId}).`,
    });
  });

  invalidateRoomScope(targetUserId);

  return {
    success: true,
    deletedUser: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    },
  };
}

// ------------------------------------------------------------ dashboard counts

export async function getAdminDashboard() {
  const [countsResult, auditRows, inventoryHealth, activeAssignments] =
    await Promise.all([
      db.execute<{
        users: number;
        laboratories: number;
        rooms: number;
        assets: number;
        materials: number;
        pending_requests: number;
        open_incidents: number;
        active_reservations: number;
        configured_settings: number;
      }>(sql`
        SELECT
          (SELECT count(*)::int FROM "user") AS users,
          (SELECT count(*)::int FROM laboratory WHERE active = true) AS laboratories,
          (SELECT count(*)::int FROM room WHERE active = true) AS rooms,
          ((SELECT count(*)::int FROM instrument_asset) + (SELECT count(*)::int FROM tool_asset)) AS assets,
          (SELECT count(*)::int FROM material WHERE active = true) AS materials,
          (SELECT count(*)::int FROM resource_request WHERE status = 'PENDING_PLP') AS pending_requests,
          (SELECT count(*)::int FROM incident WHERE status <> 'RESOLVED') AS open_incidents,
          (SELECT count(*)::int FROM reservation WHERE status = 'RESERVED') AS active_reservations,
          (SELECT count(*)::int FROM app_setting) AS configured_settings
      `),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          actorName: user.name,
          createdAt: auditLog.createdAt,
          reason: auditLog.reason,
        })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorId))
        .orderBy(desc(auditLog.createdAt))
        .limit(8),
      getInventoryHealth(),
      countActiveAssignments(),
    ]);
  const summary = countsResult.rows[0];
  return {
    counts: {
      users: summary?.users ?? 0,
      laboratories: summary?.laboratories ?? 0,
      rooms: summary?.rooms ?? 0,
      assets: summary?.assets ?? 0,
      materials: summary?.materials ?? 0,
      pendingRequests: summary?.pending_requests ?? 0,
      openIncidents: summary?.open_incidents ?? 0,
      activeReservations: summary?.active_reservations ?? 0,
      configuredSettings: summary?.configured_settings ?? 0,
      lowStockMaterials: inventoryHealth.lowStock,
      expiringBatches: inventoryHealth.expiring,
      expiredBatches: inventoryHealth.expired,
      activeAssignments,
    },
    recentAudit: (
      auditRows as Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        actorName: string | null;
        createdAt: Date;
        reason: string | null;
      }>
    ).map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
