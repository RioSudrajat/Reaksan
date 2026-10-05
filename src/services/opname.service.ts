import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  equipmentAsset,
  equipmentType,
  equipmentUnit,
  material,
  materialBatch,
  room,
  stockOpnameEntry,
  stockOpnameSession,
  user,
} from "@/db/schema";
import { writeAudit } from "@/services/audit.service";
import { recordStockTransaction } from "@/services/stock.service";
import {
  OpnameAddIntakeInput,
  OpnameCountInput,
} from "@/validators/opname";

type OpnameStatus = (typeof stockOpnameSession.$inferSelect)["status"];

export type OpnameSessionListInput = {
  roomCode?: string;
  roomCodes?: string[] | null;
  status?: OpnameStatus;
  limit: number;
  offset: number;
};

const completer = alias(user, "opname_completer");

// Baseline quantities are captured once when the session starts. The session
// and its entries are a record only: nothing here writes material_batch or
// stock_transaction.
export async function createOpnameSession(
  actorId: string,
  input: { roomCode: string; notes?: string },
) {
  return db.transaction(async (tx) => {
    const [roomRow] = await tx
      .select()
      .from(room)
      .where(and(eq(room.code, input.roomCode), eq(room.active, true)))
      .limit(1);
    if (!roomRow)
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Room tidak ditemukan atau tidak aktif.",
      );
    const [running] = await tx
      .select({ id: stockOpnameSession.id })
      .from(stockOpnameSession)
      .where(
        and(
          eq(stockOpnameSession.roomId, roomRow.id),
          eq(stockOpnameSession.status, "IN_PROGRESS"),
        ),
      )
      .limit(1);
    if (running)
      throw new ApiError(
        409,
        "SESSION_RUNNING",
        "Masih ada sesi hitung berjalan untuk room ini.",
      );

    // 1. Fetch material batches for this room
    const batches = await tx
      .select({
        id: materialBatch.id,
        quantity: materialBatch.quantity,
        storageLocation: materialBatch.storageLocation,
      })
      .from(materialBatch)
      .where(
        and(
          eq(materialBatch.roomId, roomRow.id),
          eq(materialBatch.active, true),
        ),
      );

    // 2. Fetch equipment assets (grouped by catalog/type) located in this room
    const assets = await tx
      .select({
        assetId: equipmentAsset.id,
        assetCode: equipmentAsset.assetCode,
        condition: equipmentAsset.condition,
        typeName: equipmentType.name,
        classification: equipmentType.classification,
        unitCount: count(equipmentUnit.id),
        sampleLocation: sql<string | null>`max(${equipmentUnit.storageLocation})`,
      })
      .from(equipmentAsset)
      .innerJoin(
        equipmentType,
        eq(equipmentAsset.equipmentTypeId, equipmentType.id),
      )
      .leftJoin(
        equipmentUnit,
        and(
          eq(equipmentUnit.equipmentAssetId, equipmentAsset.id),
          eq(equipmentUnit.active, true),
        ),
      )
      .where(
        and(
          eq(equipmentAsset.roomId, roomRow.id),
          eq(equipmentAsset.active, true),
        ),
      )
      .groupBy(
        equipmentAsset.id,
        equipmentAsset.assetCode,
        equipmentAsset.condition,
        equipmentType.name,
        equipmentType.classification,
      );

    if (batches.length === 0 && assets.length === 0)
      throw new ApiError(
        409,
        "NO_ITEMS",
        "Room ini belum punya bahan atau peralatan fisik aktif untuk dihitung.",
      );

    const [session] = await tx
      .insert(stockOpnameSession)
      .values({
        roomId: roomRow.id,
        startedById: actorId,
        notes: input.notes ?? null,
      })
      .returning();

    const entriesToInsert = [
      ...batches.map((batch) => ({
        sessionId: session.id,
        itemType: "MATERIAL" as const,
        materialBatchId: batch.id,
        equipmentAssetId: null,
        equipmentUnitId: null,
        baselineQuantity: batch.quantity,
        countedQuantity: batch.quantity,
        condition: null,
        storageLocation: batch.storageLocation ?? null,
        entrySource: "SYSTEM_PLANNED" as const,
        countedById: actorId,
      })),
      ...assets.map((asset) => ({
        sessionId: session.id,
        itemType:
          asset.classification === "TOOL"
            ? ("TOOL" as const)
            : ("INSTRUMENT" as const),
        materialBatchId: null,
        equipmentAssetId: asset.assetId,
        equipmentUnitId: null,
        baselineQuantity: String(asset.unitCount),
        countedQuantity: String(asset.unitCount),
        condition: asset.condition ?? "GOOD",
        storageLocation:
          asset.sampleLocation ??
          (asset.classification === "TOOL"
            ? "Meja Praktikum 1-4"
            : "Gudang Instrumen"),
        entrySource: "SYSTEM_PLANNED" as const,
        countedById: actorId,
      })),
    ];

    await tx.insert(stockOpnameEntry).values(entriesToInsert);

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "stock_opname_session",
      entityId: session.id,
      after: {
        room: roomRow.code,
        batches: batches.length,
        assets: assets.length,
        totalItems: entriesToInsert.length,
      },
    });
    return session;
  });
}

export async function recordOpnameCount(
  actorId: string,
  sessionId: string,
  input: OpnameCountInput,
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(stockOpnameSession)
      .where(eq(stockOpnameSession.id, sessionId))
      .limit(1)
      .for("update");
    if (!session)
      throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
    if (session.status !== "IN_PROGRESS")
      throw new ApiError(
        409,
        "SESSION_CLOSED",
        "Sesi hitung sudah selesai atau dibatalkan.",
      );

    let whereClause;
    if (input.entryId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        eq(stockOpnameEntry.id, input.entryId),
      );
    } else if (input.materialBatchId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        eq(stockOpnameEntry.materialBatchId, input.materialBatchId),
      );
    } else if (input.equipmentAssetId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        eq(stockOpnameEntry.equipmentAssetId, input.equipmentAssetId),
      );
    } else if (input.equipmentUnitId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        eq(stockOpnameEntry.equipmentUnitId, input.equipmentUnitId),
      );
    } else {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Tentukan entryId, materialBatchId, equipmentAssetId, atau equipmentUnitId.",
      );
    }

    const [entry] = await tx
      .select()
      .from(stockOpnameEntry)
      .where(whereClause)
      .limit(1);

    if (!entry)
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Item tidak termasuk dalam sesi opname ini.",
      );

    const [updated] = await tx
      .update(stockOpnameEntry)
      .set({
        countedQuantity: input.countedQuantity.toFixed(3),
        countedById: actorId,
        countedAt: new Date(),
        condition:
          input.condition !== undefined ? input.condition : entry.condition,
        varianceReason:
          input.varianceReason === undefined
            ? entry.varianceReason
            : input.varianceReason,
        storageLocation:
          input.storageLocation === undefined
            ? entry.storageLocation
            : input.storageLocation,
        notes: input.notes === undefined ? entry.notes : input.notes,
      })
      .where(eq(stockOpnameEntry.id, entry.id))
      .returning();

    // Sync storage location to source table if updated
    if (input.storageLocation !== undefined) {
      if (entry.materialBatchId) {
        await tx
          .update(materialBatch)
          .set({ storageLocation: input.storageLocation })
          .where(eq(materialBatch.id, entry.materialBatchId));
      } else if (entry.equipmentAssetId) {
        await tx
          .update(equipmentUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(equipmentUnit.equipmentAssetId, entry.equipmentAssetId));
      } else if (entry.equipmentUnitId) {
        await tx
          .update(equipmentUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(equipmentUnit.id, entry.equipmentUnitId));
      }
    }

    // Sync equipment condition if provided
    if (input.condition !== undefined) {
      if (entry.equipmentAssetId) {
        await tx
          .update(equipmentAsset)
          .set({ condition: input.condition })
          .where(eq(equipmentAsset.id, entry.equipmentAssetId));
      } else if (entry.equipmentUnitId) {
        await tx
          .update(equipmentUnit)
          .set({ condition: input.condition })
          .where(eq(equipmentUnit.id, entry.equipmentUnitId));
      }
    }

    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "stock_opname_entry",
      entityId: entry.id,
      before: {
        countedQuantity: Number(entry.countedQuantity),
        condition: entry.condition,
      },
      after: {
        countedQuantity: input.countedQuantity,
        condition: input.condition,
        varianceReason: input.varianceReason,
      },
    });
    return updated;
  });
}

export async function recordOpnameIntake(
  actorId: string,
  sessionId: string,
  input: OpnameAddIntakeInput,
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(stockOpnameSession)
      .where(eq(stockOpnameSession.id, sessionId))
      .limit(1)
      .for("update");
    if (!session)
      throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
    if (session.status !== "IN_PROGRESS")
      throw new ApiError(
        409,
        "SESSION_CLOSED",
        "Sesi hitung sudah selesai atau dibatalkan.",
      );

    let matId = input.materialId;
    let matName = "Bahan";
    if (input.newMaterial) {
      const [existingMat] = await tx
        .select()
        .from(material)
        .where(eq(material.code, input.newMaterial.code.toUpperCase()))
        .limit(1);

      if (existingMat) {
        matId = existingMat.id;
        matName = existingMat.name;
      } else {
        const [createdMat] = await tx
          .insert(material)
          .values({
            code: input.newMaterial.code.toUpperCase(),
            name: input.newMaterial.name,
            baseUnit: input.newMaterial.baseUnit,
            category: input.newMaterial.category || "Umum",
            description: "Didaftarkan saat Stock Opname (Intake)",
          })
          .returning();
        matId = createdMat.id;
        matName = createdMat.name;
      }
    } else if (matId) {
      const [mat] = await tx
        .select()
        .from(material)
        .where(eq(material.id, matId))
        .limit(1);
      if (!mat)
        throw new ApiError(404, "NOT_FOUND", "Bahan master tidak ditemukan.");
      matName = mat.name;
    } else {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Pilih bahan atau isi data bahan baru.",
      );
    }

    const generatedLot =
      input.lotNumber ||
      `${input.entrySource === "GRANT_HIBAH" ? "HIB" : input.entrySource === "LEFTOVER_RETURN" ? "SIS" : "FND"}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`;

    // Create a new batch in this room with baseline quantity 0
    const [newBatch] = await tx
      .insert(materialBatch)
      .values({
        materialId: matId!,
        roomId: session.roomId,
        lotNumber: generatedLot,
        qrCode: `RK-MAT-${generatedLot}`,
        storageLocation: input.storageLocation ?? null,
        quantity: "0.000",
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      })
      .returning();

    const defaultVariance =
      input.varianceReason ??
      (input.entrySource === "GRANT_HIBAH"
        ? "GRANT_INTAKE"
        : input.entrySource === "LEFTOVER_RETURN"
          ? "RETURNED_LEFTOVER"
          : "OTHER");

    const [entry] = await tx
      .insert(stockOpnameEntry)
      .values({
        sessionId: session.id,
        materialBatchId: newBatch.id,
        baselineQuantity: "0.000",
        countedQuantity: input.countedQuantity.toFixed(3),
        countedById: actorId,
        entrySource: input.entrySource,
        varianceReason: defaultVariance,
        storageLocation: input.storageLocation ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "stock_opname_entry",
      entityId: entry.id,
      after: {
        source: input.entrySource,
        material: matName,
        countedQuantity: input.countedQuantity,
      },
    });

    return entry;
  });
}

export async function completeOpnameSession(
  actorId: string,
  sessionId: string,
  input: { notes?: string },
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(stockOpnameSession)
      .where(eq(stockOpnameSession.id, sessionId))
      .limit(1)
      .for("update");
    if (!session)
      throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
    if (session.status !== "IN_PROGRESS")
      throw new ApiError(
        409,
        "SESSION_CLOSED",
        "Sesi hitung sudah selesai atau dibatalkan.",
      );
    const [updated] = await tx
      .update(stockOpnameSession)
      .set({
        status: "COMPLETED",
        completedById: actorId,
        completedAt: new Date(),
        notes: input.notes === undefined ? session.notes : input.notes,
      })
      .where(eq(stockOpnameSession.id, sessionId))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "COMPLETE",
      entityType: "stock_opname_session",
      entityId: sessionId,
      after: { status: "COMPLETED" },
    });
    return updated;
  });
}

export async function cancelOpnameSession(actorId: string, sessionId: string) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(stockOpnameSession)
      .where(eq(stockOpnameSession.id, sessionId))
      .limit(1)
      .for("update");
    if (!session)
      throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
    if (session.status !== "IN_PROGRESS")
      throw new ApiError(
        409,
        "SESSION_CLOSED",
        "Sesi hitung sudah selesai atau dibatalkan.",
      );
    const [updated] = await tx
      .update(stockOpnameSession)
      .set({ status: "CANCELLED" })
      .where(eq(stockOpnameSession.id, sessionId))
      .returning();

    // Deactivate zero-baseline intake batches added during this cancelled session
    const intakeEntries = await tx
      .select({ materialBatchId: stockOpnameEntry.materialBatchId })
      .from(stockOpnameEntry)
      .where(
        and(
          eq(stockOpnameEntry.sessionId, sessionId),
          eq(stockOpnameEntry.baselineQuantity, "0.000"),
        ),
      );
    const batchIds = intakeEntries
      .map((e) => e.materialBatchId)
      .filter((id): id is string => Boolean(id));
    if (batchIds.length > 0) {
      await tx
        .update(materialBatch)
        .set({ active: false })
        .where(inArray(materialBatch.id, batchIds));
    }

    await writeAudit(tx, {
      actorId,
      action: "CANCEL",
      entityType: "stock_opname_session",
      entityId: sessionId,
      after: { status: "CANCELLED" },
    });
    return updated;
  });
}

export async function listOpnameSessions(input: OpnameSessionListInput) {
  const conditions = [];
  if (input.roomCode) conditions.push(eq(room.code, input.roomCode));
  if (input.roomCodes !== undefined)
    conditions.push(
      input.roomCodes === null
        ? sql`true`
        : input.roomCodes.length === 0
          ? sql`false`
          : inArray(room.code, input.roomCodes),
    );
  if (input.status)
    conditions.push(eq(stockOpnameSession.status, input.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: stockOpnameSession.id,
        status: stockOpnameSession.status,
        startedAt: stockOpnameSession.startedAt,
        completedAt: stockOpnameSession.completedAt,
        notes: stockOpnameSession.notes,
        roomCode: room.code,
        roomName: room.name,
        startedByName: user.name,
        entryCount: count(stockOpnameEntry.id),
      })
      .from(stockOpnameSession)
      .innerJoin(room, eq(room.id, stockOpnameSession.roomId))
      .innerJoin(user, eq(user.id, stockOpnameSession.startedById))
      .leftJoin(
        stockOpnameEntry,
        eq(stockOpnameEntry.sessionId, stockOpnameSession.id),
      )
      .where(where)
      .groupBy(stockOpnameSession.id, room.code, room.name, user.name)
      .orderBy(desc(stockOpnameSession.startedAt))
      .limit(input.limit)
      .offset(input.offset),
    db
      .select({ count: count() })
      .from(stockOpnameSession)
      .innerJoin(room, eq(room.id, stockOpnameSession.roomId))
      .where(where),
  ]);
  const total = totalRow[0]?.count ?? 0;
  return {
    data: rows,
    meta: {
      limit: input.limit,
      offset: input.offset,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    },
  };
}

export type OpnameEntryRow = {
  id: string;
  itemType: "MATERIAL" | "TOOL" | "INSTRUMENT";
  materialBatchId: string | null;
  equipmentAssetId: string | null;
  equipmentUnitId: string | null;
  materialCode: string;
  materialName: string;
  lotNumber: string | null;
  qrCode: string | null;
  unit: string;
  condition: string | null;
  storageLocation: string | null;
  entrySource: string;
  varianceReason: string | null;
  expiryDate: Date | null;
  baseline: number;
  counted: number;
  difference: number;
  notes: string | null;
  countedByName: string;
  countedAt: Date;
};

export async function getOpnameSessionDetail(id: string) {
  const [session] = await db
    .select({
      id: stockOpnameSession.id,
      roomId: stockOpnameSession.roomId,
      startedById: stockOpnameSession.startedById,
      status: stockOpnameSession.status,
      startedAt: stockOpnameSession.startedAt,
      completedAt: stockOpnameSession.completedAt,
      notes: stockOpnameSession.notes,
      roomCode: room.code,
      roomName: room.name,
      startedByName: user.name,
      completedByName: completer.name,
    })
    .from(stockOpnameSession)
    .innerJoin(room, eq(room.id, stockOpnameSession.roomId))
    .innerJoin(user, eq(user.id, stockOpnameSession.startedById))
    .leftJoin(completer, eq(completer.id, stockOpnameSession.completedById))
    .where(eq(stockOpnameSession.id, id))
    .limit(1);
  if (!session) return null;

  if (session.status === "IN_PROGRESS") {
    // Purge legacy per-unit entries so in-progress opname only tracks asset catalog rows
    await db
      .delete(stockOpnameEntry)
      .where(
        and(
          eq(stockOpnameEntry.sessionId, id),
          isNotNull(stockOpnameEntry.equipmentUnitId),
        ),
      );

    const existingEntries = await db
      .select({
        batchId: stockOpnameEntry.materialBatchId,
        assetId: stockOpnameEntry.equipmentAssetId,
        unitId: stockOpnameEntry.equipmentUnitId,
      })
      .from(stockOpnameEntry)
      .where(eq(stockOpnameEntry.sessionId, id));

    const existingBatchIds = new Set(
      existingEntries.map((e) => e.batchId).filter(Boolean),
    );
    const existingAssetIds = new Set(
      existingEntries.map((e) => e.assetId).filter(Boolean),
    );

    const roomBatches = await db
      .select({
        id: materialBatch.id,
        quantity: materialBatch.quantity,
        storageLocation: materialBatch.storageLocation,
      })
      .from(materialBatch)
      .where(
        and(
          eq(materialBatch.roomId, session.roomId),
          eq(materialBatch.active, true),
        ),
      );

    const roomAssets = await db
      .select({
        assetId: equipmentAsset.id,
        assetCode: equipmentAsset.assetCode,
        condition: equipmentAsset.condition,
        typeName: equipmentType.name,
        classification: equipmentType.classification,
        unitCount: count(equipmentUnit.id),
        sampleLocation: sql<string | null>`max(${equipmentUnit.storageLocation})`,
      })
      .from(equipmentAsset)
      .innerJoin(
        equipmentType,
        eq(equipmentAsset.equipmentTypeId, equipmentType.id),
      )
      .leftJoin(
        equipmentUnit,
        and(
          eq(equipmentUnit.equipmentAssetId, equipmentAsset.id),
          eq(equipmentUnit.active, true),
        ),
      )
      .where(
        and(
          eq(equipmentAsset.roomId, session.roomId),
          eq(equipmentAsset.active, true),
        ),
      )
      .groupBy(
        equipmentAsset.id,
        equipmentAsset.assetCode,
        equipmentAsset.condition,
        equipmentType.name,
        equipmentType.classification,
      );

    const toInsert = [];
    for (const b of roomBatches) {
      if (!existingBatchIds.has(b.id)) {
        toInsert.push({
          sessionId: id,
          itemType: "MATERIAL" as const,
          materialBatchId: b.id,
          equipmentAssetId: null,
          equipmentUnitId: null,
          baselineQuantity: b.quantity,
          countedQuantity: b.quantity,
          condition: null,
          storageLocation: b.storageLocation ?? null,
          entrySource: "SYSTEM_PLANNED" as const,
          countedById: session.startedById,
        });
      }
    }

    for (const a of roomAssets) {
      if (!existingAssetIds.has(a.assetId)) {
        toInsert.push({
          sessionId: id,
          itemType:
            a.classification === "TOOL"
              ? ("TOOL" as const)
              : ("INSTRUMENT" as const),
          materialBatchId: null,
          equipmentAssetId: a.assetId,
          equipmentUnitId: null,
          baselineQuantity: String(a.unitCount),
          countedQuantity: String(a.unitCount),
          condition: a.condition ?? "GOOD",
          storageLocation:
            a.sampleLocation ??
            (a.classification === "TOOL"
              ? "Meja Praktikum 1-4"
              : "Gudang Instrumen"),
          entrySource: "SYSTEM_PLANNED" as const,
          countedById: session.startedById,
        });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(stockOpnameEntry).values(toInsert).onConflictDoNothing();
    }
  }

  const rows = await db
    .select({
      id: stockOpnameEntry.id,
      itemType: stockOpnameEntry.itemType,
      materialBatchId: stockOpnameEntry.materialBatchId,
      equipmentAssetId: stockOpnameEntry.equipmentAssetId,
      equipmentUnitId: stockOpnameEntry.equipmentUnitId,
      entrySource: stockOpnameEntry.entrySource,
      varianceReason: stockOpnameEntry.varianceReason,
      baselineQuantity: stockOpnameEntry.baselineQuantity,
      countedQuantity: stockOpnameEntry.countedQuantity,
      entryCondition: stockOpnameEntry.condition,
      entryStorageLocation: stockOpnameEntry.storageLocation,
      notes: stockOpnameEntry.notes,
      countedAt: stockOpnameEntry.countedAt,
      countedByName: user.name,
      // Material
      matCode: material.code,
      matName: material.name,
      matUnit: material.baseUnit,
      batchLot: materialBatch.lotNumber,
      batchQr: materialBatch.qrCode,
      batchExpiry: materialBatch.expiryDate,
      batchLocation: materialBatch.storageLocation,
      // Equipment Asset
      assetCode: equipmentAsset.assetCode,
      assetCondition: equipmentAsset.condition,
      typeName: equipmentType.name,
      typeClassification: equipmentType.classification,
      // Equipment Unit (legacy)
      eqUnitCode: equipmentUnit.code,
      eqUnitLabel: equipmentUnit.label,
      eqUnitQr: equipmentUnit.qrCode,
      eqUnitCondition: equipmentUnit.condition,
      eqUnitLocation: equipmentUnit.storageLocation,
    })
    .from(stockOpnameEntry)
    .leftJoin(
      materialBatch,
      eq(materialBatch.id, stockOpnameEntry.materialBatchId),
    )
    .leftJoin(material, eq(material.id, materialBatch.materialId))
    .leftJoin(
      equipmentUnit,
      eq(equipmentUnit.id, stockOpnameEntry.equipmentUnitId),
    )
    .leftJoin(
      equipmentAsset,
      sql`${equipmentAsset.id} = coalesce(${stockOpnameEntry.equipmentAssetId}, ${equipmentUnit.equipmentAssetId})`,
    )
    .leftJoin(
      equipmentType,
      eq(equipmentType.id, equipmentAsset.equipmentTypeId),
    )
    .innerJoin(user, eq(user.id, stockOpnameEntry.countedById))
    .where(
      and(
        eq(stockOpnameEntry.sessionId, id),
        isNull(stockOpnameEntry.equipmentUnitId),
      ),
    )
    .orderBy(asc(stockOpnameEntry.itemType), asc(stockOpnameEntry.countedAt));

  const entries: OpnameEntryRow[] = rows.map((row) => {
    const isMaterial = row.itemType === "MATERIAL";
    const baseline = Number(row.baselineQuantity);
    const counted = Number(row.countedQuantity);
    const code = isMaterial
      ? (row.matCode ?? "-")
      : (row.assetCode ?? row.eqUnitCode ?? "-");
    const name = isMaterial
      ? (row.matName ?? "-")
      : (row.typeName ?? "-");
    const lotNumber = isMaterial
      ? row.batchLot
      : `${row.assetCode ?? row.eqUnitCode} (${baseline} unit)`;
    const qrCode = isMaterial
      ? row.batchQr
      : (row.assetCode ?? row.eqUnitQr);
    const unit = isMaterial ? (row.matUnit ?? "satuan") : "unit";
    const storageLocation =
      row.entryStorageLocation ??
      (isMaterial
        ? row.batchLocation
        : (row.eqUnitLocation ?? (row.typeClassification === "TOOL" ? "Meja Praktikum 1-4" : "Gudang Instrumen")));
    const condition = isMaterial
      ? null
      : (row.entryCondition ?? row.assetCondition ?? row.eqUnitCondition ?? "GOOD");

    return {
      id: row.id,
      itemType: row.itemType,
      materialBatchId: row.materialBatchId,
      equipmentAssetId: row.equipmentAssetId,
      equipmentUnitId: row.equipmentUnitId,
      materialCode: code,
      materialName: name,
      lotNumber,
      qrCode,
      unit,
      condition,
      storageLocation,
      entrySource: row.entrySource,
      varianceReason: row.varianceReason,
      expiryDate: row.batchExpiry,
      baseline,
      counted,
      difference: counted - baseline,
      notes: row.notes,
      countedByName: row.countedByName,
      countedAt: row.countedAt,
    };
  });
  return { ...session, entries };
}

export async function getOpnameVarianceReport(id: string) {
  const session = await getOpnameSessionDetail(id);
  if (!session) return null;
  const batchesWithDifference = session.entries.filter(
    (entry) => Math.abs(entry.difference) > 1e-9 || entry.condition === "DAMAGED",
  ).length;
  const positiveTotal = session.entries
    .filter((e) => e.itemType === "MATERIAL")
    .reduce((total, entry) => total + Math.max(0, entry.difference), 0);
  const negativeTotal = session.entries
    .filter((e) => e.itemType === "MATERIAL")
    .reduce((total, entry) => total + Math.min(0, entry.difference), 0);
  return {
    session,
    totals: {
      totalBatches: session.entries.length,
      batchesWithDifference,
      positiveTotal,
      negativeTotal,
      netDifference: positiveTotal + negativeTotal,
    },
  };
}

export async function listOpnameCandidates(roomCode?: string) {
  return db
    .select({
      batchId: materialBatch.id,
      materialCode: material.code,
      materialName: material.name,
      unit: material.baseUnit,
      roomCode: room.code,
      roomName: room.name,
      lotNumber: materialBatch.lotNumber,
      quantity: materialBatch.quantity,
      expiryDate: materialBatch.expiryDate,
    })
    .from(materialBatch)
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(room, eq(room.id, materialBatch.roomId))
    .where(
      and(
        eq(materialBatch.active, true),
        roomCode ? eq(room.code, roomCode) : undefined,
      ),
    )
    .orderBy(asc(material.name), asc(materialBatch.expiryDate))
    .limit(500);
}

export async function reconcileOpnameDiscrepancies(
  actorId: string,
  sessionId: string,
  options: { reason?: string } = {},
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        id: stockOpnameSession.id,
        status: stockOpnameSession.status,
        roomId: stockOpnameSession.roomId,
      })
      .from(stockOpnameSession)
      .where(eq(stockOpnameSession.id, sessionId))
      .limit(1)
      .for("update");
    if (!session) {
      throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
    }
    if (session.status !== "COMPLETED") {
      throw new ApiError(
        400,
        "INVALID_STATUS",
        "Hanya sesi dengan status COMPLETED yang dapat direkonsiliasi.",
      );
    }

    const entries = await tx
      .select({
        id: stockOpnameEntry.id,
        itemType: stockOpnameEntry.itemType,
        materialBatchId: stockOpnameEntry.materialBatchId,
        equipmentAssetId: stockOpnameEntry.equipmentAssetId,
        equipmentUnitId: stockOpnameEntry.equipmentUnitId,
        baselineQuantity: stockOpnameEntry.baselineQuantity,
        countedQuantity: stockOpnameEntry.countedQuantity,
        condition: stockOpnameEntry.condition,
        entrySource: stockOpnameEntry.entrySource,
        varianceReason: stockOpnameEntry.varianceReason,
        storageLocation: stockOpnameEntry.storageLocation,
        batchCurrentQty: materialBatch.quantity,
        unitCurrentCondition: equipmentUnit.condition,
        unitCurrentStatus: equipmentUnit.status,
      })
      .from(stockOpnameEntry)
      .leftJoin(
        materialBatch,
        eq(materialBatch.id, stockOpnameEntry.materialBatchId),
      )
      .leftJoin(
        equipmentUnit,
        eq(equipmentUnit.id, stockOpnameEntry.equipmentUnitId),
      )
      .where(eq(stockOpnameEntry.sessionId, sessionId))
      .for("update");

    let reconciledCount = 0;
    for (const entry of entries) {
      const counted = Number(entry.countedQuantity);

      // --- RECONCILE EQUIPMENT ASSETS (TOOLS & INSTRUMENTS BY CATALOG) ---
      if (entry.equipmentAssetId) {
        const activeUnits = await tx
          .select({
            id: equipmentUnit.id,
            code: equipmentUnit.code,
            condition: equipmentUnit.condition,
            status: equipmentUnit.status,
          })
          .from(equipmentUnit)
          .where(
            and(
              eq(equipmentUnit.equipmentAssetId, entry.equipmentAssetId),
              eq(equipmentUnit.active, true),
            ),
          )
          .orderBy(asc(equipmentUnit.code));

        const newCondition = entry.condition ?? "GOOD";
        const targetCount = Math.max(0, Math.floor(counted));
        const currentCount = activeUnits.length;
        const diff = targetCount - currentCount;

        if (diff < 0) {
          const toMark = Math.abs(diff);
          for (let i = 0; i < toMark && i < activeUnits.length; i++) {
            const unit = activeUnits[activeUnits.length - 1 - i];
            await tx
              .update(equipmentUnit)
              .set({
                condition: newCondition === "GOOD" ? "DAMAGED" : newCondition,
                status: "DAMAGED",
                notes: `Selisih opname: unit berkurang saat sensus (${diff} unit)`,
                updatedAt: new Date(),
              })
              .where(eq(equipmentUnit.id, unit.id));
          }
        } else if (diff > 0) {
          const [assetRow] = await tx
            .select({ assetCode: equipmentAsset.assetCode })
            .from(equipmentAsset)
            .where(eq(equipmentAsset.id, entry.equipmentAssetId))
            .limit(1);

          for (let i = 0; i < diff; i++) {
            const unitCode = `${assetRow?.assetCode ?? "AST"}-U${currentCount + i + 1}`;
            await tx
              .insert(equipmentUnit)
              .values({
                equipmentAssetId: entry.equipmentAssetId,
                code: unitCode,
                label: `Unit ${unitCode}`,
                qrCode: `RK-EQ-${unitCode}`,
                storageLocation: entry.storageLocation ?? null,
                status: "AVAILABLE",
                condition: newCondition,
                notes: "Ditemukan saat Sensus Stock Opname",
                active: true,
              })
              .onConflictDoNothing();
          }
        }

        await tx
          .update(equipmentAsset)
          .set({
            condition: newCondition,
            updatedAt: new Date(),
          })
          .where(eq(equipmentAsset.id, entry.equipmentAssetId));

        if (entry.storageLocation) {
          await tx
            .update(equipmentUnit)
            .set({ storageLocation: entry.storageLocation })
            .where(eq(equipmentUnit.equipmentAssetId, entry.equipmentAssetId));
        }

        reconciledCount++;
        continue;
      }

      // --- RECONCILE EQUIPMENT UNITS (LEGACY INDIVIDUAL UNITS) ---
      if (entry.equipmentUnitId) {
        let needsUpdate = false;
        const newCondition = entry.condition ?? entry.unitCurrentCondition ?? "GOOD";
        let newStatus = entry.unitCurrentStatus ?? "AVAILABLE";

        // If counted as 0 (lost / missing)
        if (counted === 0 && entry.unitCurrentStatus !== "MAINTENANCE") {
          newStatus = "MAINTENANCE";
          needsUpdate = true;
        }

        // If reported as DAMAGED
        if (newCondition === "DAMAGED" && entry.unitCurrentStatus !== "DAMAGED") {
          newStatus = "DAMAGED";
          needsUpdate = true;
        } else if (newCondition !== entry.unitCurrentCondition) {
          needsUpdate = true;
        }

        if (entry.storageLocation) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          await tx
            .update(equipmentUnit)
            .set({
              condition: newCondition,
              status: newStatus,
              ...(entry.storageLocation ? { storageLocation: entry.storageLocation } : {}),
              updatedAt: new Date(),
            })
            .where(eq(equipmentUnit.id, entry.equipmentUnitId));

          reconciledCount++;
        }
        continue;
      }

      // --- RECONCILE MATERIAL BATCHES ---
      if (entry.materialBatchId) {
        const current = Number(entry.batchCurrentQty ?? 0);
        const diff = Math.round((counted - current) * 1000) / 1000;
        if (Math.abs(diff) < 1e-6) continue;

        if (counted < 0) {
          throw new ApiError(
            400,
            "INVALID_QUANTITY",
            "Jumlah fisik hasil hitung tidak boleh negatif.",
          );
        }

        await tx
          .update(materialBatch)
          .set({
            quantity: counted.toFixed(3),
            ...(entry.storageLocation
              ? { storageLocation: entry.storageLocation }
              : {}),
            ...(entry.varianceReason === "EXPIRED_SPOILED" && counted === 0
              ? { active: false }
              : {}),
          })
          .where(eq(materialBatch.id, entry.materialBatchId));

        let txType: "RECEIVE" | "ADJUST" | "EXPIRE" = "ADJUST";
        if (
          entry.entrySource === "GRANT_HIBAH" ||
          entry.entrySource === "LEFTOVER_RETURN" ||
          entry.entrySource === "DISCOVERY_FOUND"
        ) {
          txType = "RECEIVE";
        } else if (entry.varianceReason === "EXPIRED_SPOILED") {
          txType = "EXPIRE";
        }

        let defaultReason = `Rekonsiliasi otomatis opname sesi ${session.id} (selisih: ${diff > 0 ? "+" : ""}${diff})`;
        if (entry.entrySource === "GRANT_HIBAH") {
          defaultReason = `Penerimaan Bahan Hibah via Stock Opname (${diff > 0 ? "+" : ""}${diff})`;
        } else if (entry.entrySource === "LEFTOVER_RETURN") {
          defaultReason = `Penerimaan Sisa Praktikum via Stock Opname (${diff > 0 ? "+" : ""}${diff})`;
        } else if (entry.entrySource === "DISCOVERY_FOUND") {
          defaultReason = `Pencatatan Temuan Fisik via Stock Opname (${diff > 0 ? "+" : ""}${diff})`;
        } else if (entry.varianceReason === "NORMAL_EVAPORATION") {
          defaultReason = `Penyesuaian Susut/Evaporasi Wajar (${diff})`;
        } else if (entry.varianceReason === "SPILL_DAMAGE") {
          defaultReason = `Penyesuaian Kerusakan/Tumpah Bahan (${diff})`;
        } else if (entry.varianceReason === "EXPIRED_SPOILED") {
          defaultReason = `Penghapusan Bahan Kadaluarsa/Rusak (${diff})`;
        }

        await recordStockTransaction(tx, {
          batchId: entry.materialBatchId,
          type: txType,
          quantity: Math.abs(diff),
          before: current,
          after: counted,
          referenceType: "stock_opname",
          referenceId: session.id,
          performedById: actorId,
          reason: options.reason || defaultReason,
        });

        reconciledCount++;
      }
    }

    await writeAudit(tx, {
      actorId,
      action: "ADJUST_STOCK",
      entityType: "stock_opname_session",
      entityId: session.id,
      after: {
        reconciledCount,
        sessionId: session.id,
        reason: options.reason,
      },
    });

    return {
      sessionId: session.id,
      reconciledCount,
    };
  });
}

