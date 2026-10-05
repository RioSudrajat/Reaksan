import "server-only";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  activity,
  appSetting,
  assignment,
  auditLog,
  equipmentAsset,
  equipmentType,
  equipmentUnit,
  incident,
  laboratory,
  material,
  materialBatch,
  materialDispensingRule,
  reservation,
  resourceRequest,
  room,
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
  table: "room" | "equipment_asset" | "equipment_unit" | "material" | "laboratory",
  code: string,
  excludeId?: string,
) {
  const column = table === "equipment_asset" ? "asset_code" : "code";
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

// -------------------------------------------------------------- equipment types

export async function listEquipmentTypes() {
  return db.select().from(equipmentType).orderBy(asc(equipmentType.name));
}

export async function createEquipmentType(
  actorId: string,
  input: EquipmentTypeInput,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(equipmentType)
      .values({
        name: input.name,
        category: input.category ?? null,
        classification: input.classification ?? "INSTRUMENT",
        description: input.description ?? null,
        usageType: input.usageType,
        imageMediaId: input.imageMediaId ?? null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "equipment_type",
      entityId: created.id,
      after: {
        name: created.name,
        usageType: created.usageType,
        classification: created.classification,
      },
    });
    return created;
  });
}

export async function updateEquipmentType(
  actorId: string,
  id: string,
  input: Update<EquipmentTypeInput>,
) {
  return db.transaction(async (tx) => {
    const current = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(equipmentType)
            .where(eq(equipmentType.id, id))
            .limit(1)
        )[0],
      "Equipment type not found.",
    );
    const [updated] = await tx
      .update(equipmentType)
      .set({
        name: input.name ?? current.name,
        category: input.category === undefined ? current.category : input.category,
        classification: input.classification ?? current.classification,
        description:
          input.description === undefined
            ? current.description
            : input.description,
        usageType: input.usageType ?? current.usageType,
        imageMediaId:
          input.imageMediaId === undefined
            ? current.imageMediaId
            : input.imageMediaId,
        active: input.active ?? current.active,
      })
      .where(eq(equipmentType.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "equipment_type",
      entityId: id,
      before: {
        name: current.name,
        usageType: current.usageType,
        classification: current.classification,
      },
      after: {
        name: updated.name,
        usageType: updated.usageType,
        classification: updated.classification,
      },
    });
    return updated;
  });
}

// -------------------------------------------------------------- equipment assets

export async function listEquipmentAssetsAdmin() {
  const assets = await db
    .select({
      id: equipmentAsset.id,
      assetCode: equipmentAsset.assetCode,
      serialNumber: equipmentAsset.serialNumber,
      status: equipmentAsset.status,
      condition: equipmentAsset.condition,
      notes: equipmentAsset.notes,
      active: equipmentAsset.active,
      equipmentTypeId: equipmentAsset.equipmentTypeId,
      typeName: equipmentType.name,
      usageType: equipmentType.usageType,
      roomCode: room.code,
      roomName: room.name,
      unitCount: sql<number>`(SELECT count(*)::int FROM equipment_unit u WHERE u.equipment_asset_id = ${equipmentAsset.id} AND u.active = true)`,
      assetImageMediaId: equipmentAsset.imageMediaId,
      typeImageMediaId: equipmentType.imageMediaId,
      imageMediaId: sql<string | null>`COALESCE(${equipmentAsset.imageMediaId}, ${equipmentType.imageMediaId})`,
    })
    .from(equipmentAsset)
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(eq(equipmentAsset.active, true))
    .orderBy(asc(room.name), asc(equipmentAsset.assetCode));

  const units = await db
    .select({
      id: equipmentUnit.id,
      code: equipmentUnit.code,
      label: equipmentUnit.label,
      status: equipmentUnit.status,
      condition: equipmentUnit.condition,
      notes: equipmentUnit.notes,
      equipmentAssetId: equipmentUnit.equipmentAssetId,
    })
    .from(equipmentUnit)
    .where(eq(equipmentUnit.active, true))
    .orderBy(asc(equipmentUnit.code));

  const unitsByAsset = new Map<string, typeof units>();
  for (const unit of units) {
    const list = unitsByAsset.get(unit.equipmentAssetId) ?? [];
    list.push(unit);
    unitsByAsset.set(unit.equipmentAssetId, list);
  }

  return assets.map((asset) => ({
    ...asset,
    units: unitsByAsset.get(asset.id) ?? [],
  }));
}

export async function createEquipmentAsset(
  actorId: string,
  input: EquipmentAssetInput,
) {
  return db.transaction(async (tx) => {
    const type = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(equipmentType)
            .where(eq(equipmentType.id, input.equipmentTypeId))
            .limit(1)
        )[0],
      "Equipment type not found.",
    );
    const roomRow = await requireRow(
      async () =>
        (
          await tx.select().from(room).where(eq(room.code, input.roomCode)).limit(1)
        )[0],
      "Room not found.",
    );
    await assertCodeFree(tx, "equipment_asset", input.assetCode);
    const [created] = await tx
      .insert(equipmentAsset)
      .values({
        equipmentTypeId: type.id,
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
      entityType: "equipment_asset",
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
    const current = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(equipmentAsset)
            .where(eq(equipmentAsset.id, id))
            .limit(1)
        )[0],
      "Equipment asset not found.",
    );
    if (input.assetCode && input.assetCode !== current.assetCode)
      await assertCodeFree(tx, "equipment_asset", input.assetCode, id);
    let roomId = current.roomId;
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
      .update(equipmentAsset)
      .set({
        equipmentTypeId: input.equipmentTypeId ?? current.equipmentTypeId,
        roomId,
        assetCode: input.assetCode ?? current.assetCode,
        serialNumber:
          input.serialNumber === undefined
            ? current.serialNumber
            : input.serialNumber
              ? input.serialNumber.trim()
              : null,
        status: input.status ?? current.status,
        condition: input.condition ?? current.condition,
        notes:
          input.notes === undefined
            ? current.notes
            : input.notes
              ? input.notes.trim()
              : null,
        active: input.active ?? current.active,
      })
      .where(eq(equipmentAsset.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "equipment_asset",
      entityId: id,
      before: { status: current.status, condition: current.condition },
      after: { status: updated.status, condition: updated.condition },
    });
    return updated;
  });
}

// --------------------------------------------------------------- equipment units

export async function listEquipmentUnitsAdmin(assetCode?: string) {
  return db
    .select({
      id: equipmentUnit.id,
      code: equipmentUnit.code,
      label: equipmentUnit.label,
      qrCode: equipmentUnit.qrCode,
      storageLocation: equipmentUnit.storageLocation,
      status: equipmentUnit.status,
      condition: equipmentUnit.condition,
      notes: equipmentUnit.notes,
      active: equipmentUnit.active,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      classification: equipmentType.classification,
    })
    .from(equipmentUnit)
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, equipmentUnit.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .where(assetCode ? eq(equipmentAsset.assetCode, assetCode) : undefined)
    .orderBy(asc(equipmentUnit.code));
}

export async function createEquipmentUnit(
  actorId: string,
  input: EquipmentUnitInput,
) {
  return db.transaction(async (tx) => {
    const asset = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(equipmentAsset)
            .where(eq(equipmentAsset.assetCode, input.assetCode))
            .limit(1)
        )[0],
      "Equipment asset not found.",
    );
    await assertCodeFree(tx, "equipment_unit", input.code);
    const [created] = await tx
      .insert(equipmentUnit)
      .values({
        equipmentAssetId: asset.id,
        code: input.code,
        label: input.label,
        qrCode: `RK-UNT-${input.code}`,
        storageLocation: input.storageLocation ? input.storageLocation.trim() : null,
        status: input.status ?? "AVAILABLE",
        condition: input.condition ?? "GOOD",
        notes: input.notes ? input.notes.trim() : null,
        active: input.active ?? true,
      })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "equipment_unit",
      entityId: created.id,
      after: { code: created.code, asset: asset.assetCode },
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
    const current = await requireRow(
      async () =>
        (
          await tx
            .select()
            .from(equipmentUnit)
            .where(eq(equipmentUnit.id, id))
            .limit(1)
        )[0],
      "Equipment unit not found.",
    );
    if (input.code && input.code !== current.code)
      await assertCodeFree(tx, "equipment_unit", input.code, id);
    const [updated] = await tx
      .update(equipmentUnit)
      .set({
        code: input.code ?? current.code,
        label: input.label ?? current.label,
        storageLocation:
          input.storageLocation === undefined
            ? current.storageLocation
            : input.storageLocation
              ? input.storageLocation.trim()
              : null,
        status: input.status ?? current.status,
        condition: input.condition ?? current.condition,
        notes:
          input.notes === undefined
            ? current.notes
            : input.notes
              ? input.notes.trim()
              : null,
        active: input.active ?? current.active,
      })
      .where(eq(equipmentUnit.id, id))
      .returning();

    if (input.status && input.status !== current.status) {
      const activeUnits = await tx
        .select({ status: equipmentUnit.status })
        .from(equipmentUnit)
        .where(
          and(
            eq(equipmentUnit.equipmentAssetId, current.equipmentAssetId),
            eq(equipmentUnit.active, true),
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
          .update(equipmentAsset)
          .set({ status: "AVAILABLE" })
          .where(eq(equipmentAsset.id, current.equipmentAssetId));
      } else if (allMaintenance) {
        await tx
          .update(equipmentAsset)
          .set({ status: "MAINTENANCE" })
          .where(eq(equipmentAsset.id, current.equipmentAssetId));
      }
    }
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "equipment_unit",
      entityId: id,
      before: {
        status: current.status,
        condition: current.condition,
        active: current.active,
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
    const userRequests = await tx
      .select({ id: resourceRequest.id })
      .from(resourceRequest)
      .where(eq(resourceRequest.studentId, targetUserId));

    for (const req of userRequests) {
      await tx.execute(
        sql`DELETE FROM return_transaction WHERE issue_transaction_id IN (SELECT id FROM issue_transaction WHERE request_id = ${req.id})`,
      );
      await tx.execute(
        sql`DELETE FROM issue_transaction WHERE request_id = ${req.id}`,
      );
      await tx.execute(
        sql`DELETE FROM shared_usage_request WHERE reservation_id IN (SELECT id FROM reservation WHERE request_id = ${req.id})`,
      );
      await tx.execute(
        sql`DELETE FROM shared_usage WHERE reservation_id IN (SELECT id FROM reservation WHERE request_id = ${req.id})`,
      );
      await tx.execute(
        sql`DELETE FROM reservation WHERE request_id = ${req.id}`,
      );
      await tx.execute(
        sql`DELETE FROM equipment_request_item WHERE request_id = ${req.id}`,
      );
      await tx.execute(
        sql`DELETE FROM material_request_item WHERE request_id = ${req.id}`,
      );
      await tx.delete(resourceRequest).where(eq(resourceRequest.id, req.id));
    }

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
      sql`UPDATE equipment_condition_history SET recorded_by_id = ${operatorUserId} WHERE recorded_by_id = ${targetUserId}`,
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
  const [
    userCount,
    labCount,
    roomCount,
    assetCount,
    materialCount,
    pendingRequests,
    openIncidents,
    activeReservations,
    auditRows,
    settingRows,
    inventoryHealth,
    activeAssignments,
  ] = await Promise.all([
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(laboratory).where(eq(laboratory.active, true)),
    db.select({ count: count() }).from(room).where(eq(room.active, true)),
    db.select({ count: count() }).from(equipmentAsset),
    db.select({ count: count() }).from(material).where(eq(material.active, true)),
    db
      .select({ count: count() })
      .from(resourceRequest)
      .where(eq(resourceRequest.status, "PENDING_PLP")),
    db
      .select({ count: count() })
      .from(incident)
      .where(
        and(
          sql`${incident.status} <> 'RESOLVED'`,
        ),
      ),
    db
      .select({ count: count() })
      .from(reservation)
      .where(and(eq(reservation.status, "RESERVED"))),
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
    db.select({ count: count() }).from(appSetting),
    getInventoryHealth(),
    countActiveAssignments(),
  ]);
  return {
    counts: {
      users: userCount[0]?.count ?? 0,
      laboratories: labCount[0]?.count ?? 0,
      rooms: roomCount[0]?.count ?? 0,
      assets: assetCount[0]?.count ?? 0,
      materials: materialCount[0]?.count ?? 0,
      pendingRequests: pendingRequests[0]?.count ?? 0,
      openIncidents: openIncidents[0]?.count ?? 0,
      activeReservations: activeReservations[0]?.count ?? 0,
      configuredSettings: settingRows[0]?.count ?? 0,
      lowStockMaterials: inventoryHealth.lowStock,
      expiringBatches: inventoryHealth.expiring,
      expiredBatches: inventoryHealth.expired,
      activeAssignments,
    },
    recentAudit: auditRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
