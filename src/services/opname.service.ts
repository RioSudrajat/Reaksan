import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  auditLog,
  instrumentAsset,
  instrumentType,
  instrumentUnit,
  material,
  materialBatch,
  room,
  stockOpnameEntry,
  stockOpnameSession,
  toolAsset,
  toolType,
  toolUnit,
  user,
} from "@/db/schema";
import { writeAudit } from "@/services/audit.service";
import { recordStockTransaction } from "@/services/stock.service";
import { OpnameAddIntakeInput, OpnameCountInput } from "@/validators/opname";

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

    // 2. Fetch instrument assets located in this room
    const instrumentAssets = await tx
      .select({
        assetId: instrumentAsset.id,
        assetCode: instrumentAsset.assetCode,
        condition: instrumentAsset.condition,
        typeName: instrumentType.name,
        unitCount: count(instrumentUnit.id),
        sampleLocation: sql<
          string | null
        >`max(${instrumentUnit.storageLocation})`,
      })
      .from(instrumentAsset)
      .innerJoin(
        instrumentType,
        eq(instrumentAsset.instrumentTypeId, instrumentType.id),
      )
      .leftJoin(
        instrumentUnit,
        and(
          eq(instrumentUnit.instrumentAssetId, instrumentAsset.id),
          eq(instrumentUnit.active, true),
        ),
      )
      .where(
        and(
          eq(instrumentAsset.roomId, roomRow.id),
          eq(instrumentAsset.active, true),
        ),
      )
      .groupBy(
        instrumentAsset.id,
        instrumentAsset.assetCode,
        instrumentAsset.condition,
        instrumentType.name,
      );

    // 3. Fetch tool assets located in this room
    const toolAssets = await tx
      .select({
        assetId: toolAsset.id,
        assetCode: toolAsset.assetCode,
        condition: toolAsset.condition,
        typeName: toolType.name,
        unitCount: count(toolUnit.id),
        sampleLocation: sql<string | null>`max(${toolUnit.storageLocation})`,
      })
      .from(toolAsset)
      .innerJoin(toolType, eq(toolAsset.toolTypeId, toolType.id))
      .leftJoin(
        toolUnit,
        and(eq(toolUnit.toolAssetId, toolAsset.id), eq(toolUnit.active, true)),
      )
      .where(and(eq(toolAsset.roomId, roomRow.id), eq(toolAsset.active, true)))
      .groupBy(
        toolAsset.id,
        toolAsset.assetCode,
        toolAsset.condition,
        toolType.name,
      );

    if (
      batches.length === 0 &&
      instrumentAssets.length === 0 &&
      toolAssets.length === 0
    )
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
        instrumentAssetId: null,
        instrumentUnitId: null,
        toolAssetId: null,
        toolUnitId: null,
        baselineQuantity: batch.quantity,
        countedQuantity: batch.quantity,
        condition: null,
        storageLocation: batch.storageLocation ?? null,
        entrySource: "SYSTEM_PLANNED" as const,
        countedById: actorId,
      })),
      ...instrumentAssets.map((asset) => ({
        sessionId: session.id,
        itemType: "INSTRUMENT" as const,
        materialBatchId: null,
        instrumentAssetId: asset.assetId,
        instrumentUnitId: null,
        toolAssetId: null,
        toolUnitId: null,
        baselineQuantity: String(asset.unitCount),
        countedQuantity: String(asset.unitCount),
        condition: asset.condition ?? "GOOD",
        storageLocation: asset.sampleLocation ?? "Gudang Instrumen",
        entrySource: "SYSTEM_PLANNED" as const,
        countedById: actorId,
      })),
      ...toolAssets.map((asset) => ({
        sessionId: session.id,
        itemType: "TOOL" as const,
        materialBatchId: null,
        instrumentAssetId: null,
        instrumentUnitId: null,
        toolAssetId: asset.assetId,
        toolUnitId: null,
        baselineQuantity: String(asset.unitCount),
        countedQuantity: String(asset.unitCount),
        condition: asset.condition ?? "GOOD",
        storageLocation: asset.sampleLocation ?? "Meja Praktikum 1-4",
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
        instruments: instrumentAssets.length,
        tools: toolAssets.length,
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
    const targetAssetId =
      input.instrumentAssetId ?? input.toolAssetId ?? input.equipmentAssetId;
    const targetUnitId =
      input.instrumentUnitId ?? input.toolUnitId ?? input.equipmentUnitId;

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
    } else if (targetAssetId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        sql`(${stockOpnameEntry.instrumentAssetId} = ${targetAssetId} OR ${stockOpnameEntry.toolAssetId} = ${targetAssetId})`,
      );
    } else if (targetUnitId) {
      whereClause = and(
        eq(stockOpnameEntry.sessionId, sessionId),
        sql`(${stockOpnameEntry.instrumentUnitId} = ${targetUnitId} OR ${stockOpnameEntry.toolUnitId} = ${targetUnitId})`,
      );
    } else {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Tentukan entryId, materialBatchId, assetId, atau unitId.",
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
      } else if (entry.instrumentAssetId) {
        await tx
          .update(instrumentUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(instrumentUnit.instrumentAssetId, entry.instrumentAssetId));
      } else if (entry.instrumentUnitId) {
        await tx
          .update(instrumentUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(instrumentUnit.id, entry.instrumentUnitId));
      } else if (entry.toolAssetId) {
        await tx
          .update(toolUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(toolUnit.toolAssetId, entry.toolAssetId));
      } else if (entry.toolUnitId) {
        await tx
          .update(toolUnit)
          .set({ storageLocation: input.storageLocation })
          .where(eq(toolUnit.id, entry.toolUnitId));
      }
    }

    // Sync condition if provided
    if (input.condition !== undefined) {
      if (entry.instrumentAssetId) {
        await tx
          .update(instrumentAsset)
          .set({ condition: input.condition })
          .where(eq(instrumentAsset.id, entry.instrumentAssetId));
      } else if (entry.instrumentUnitId) {
        await tx
          .update(instrumentUnit)
          .set({ condition: input.condition })
          .where(eq(instrumentUnit.id, entry.instrumentUnitId));
      } else if (entry.toolAssetId) {
        await tx
          .update(toolAsset)
          .set({ condition: input.condition })
          .where(eq(toolAsset.id, entry.toolAssetId));
      } else if (entry.toolUnitId) {
        await tx
          .update(toolUnit)
          .set({ condition: input.condition })
          .where(eq(toolUnit.id, entry.toolUnitId));
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
  instrumentAssetId?: string | null;
  instrumentUnitId?: string | null;
  toolAssetId?: string | null;
  toolUnitId?: string | null;
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
    // Synchronise the planned entries inside a locked transaction so two
    // concurrent GET requests cannot race on DELETE / INSERT of entries.
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ status: stockOpnameSession.status })
        .from(stockOpnameSession)
        .where(eq(stockOpnameSession.id, id))
        .limit(1)
        .for("update");
      if (locked?.status !== "IN_PROGRESS") return;

      // Purge legacy per-unit entries so in-progress opname only tracks asset catalog rows
      await tx
        .delete(stockOpnameEntry)
        .where(
          and(
            eq(stockOpnameEntry.sessionId, id),
            sql`(${stockOpnameEntry.instrumentUnitId} IS NOT NULL OR ${stockOpnameEntry.toolUnitId} IS NOT NULL)`,
          ),
        );

      const existingEntries = await tx
        .select({
          batchId: stockOpnameEntry.materialBatchId,
          insAssetId: stockOpnameEntry.instrumentAssetId,
          toolAssetId: stockOpnameEntry.toolAssetId,
        })
        .from(stockOpnameEntry)
        .where(eq(stockOpnameEntry.sessionId, id));

      const existingBatchIds = new Set(
        existingEntries.map((e) => e.batchId).filter(Boolean),
      );
      const existingInsAssetIds = new Set(
        existingEntries.map((e) => e.insAssetId).filter(Boolean),
      );
      const existingToolAssetIds = new Set(
        existingEntries.map((e) => e.toolAssetId).filter(Boolean),
      );

      const [roomBatches, roomInstruments, roomTools] = await Promise.all([
        tx
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
          ),
        tx
          .select({
            assetId: instrumentAsset.id,
            assetCode: instrumentAsset.assetCode,
            condition: instrumentAsset.condition,
            typeName: instrumentType.name,
            unitCount: count(instrumentUnit.id),
            sampleLocation: sql<
              string | null
            >`max(${instrumentUnit.storageLocation})`,
          })
          .from(instrumentAsset)
          .innerJoin(
            instrumentType,
            eq(instrumentAsset.instrumentTypeId, instrumentType.id),
          )
          .leftJoin(
            instrumentUnit,
            and(
              eq(instrumentUnit.instrumentAssetId, instrumentAsset.id),
              eq(instrumentUnit.active, true),
            ),
          )
          .where(
            and(
              eq(instrumentAsset.roomId, session.roomId),
              eq(instrumentAsset.active, true),
            ),
          )
          .groupBy(
            instrumentAsset.id,
            instrumentAsset.assetCode,
            instrumentAsset.condition,
            instrumentType.name,
          ),
        tx
          .select({
            assetId: toolAsset.id,
            assetCode: toolAsset.assetCode,
            condition: toolAsset.condition,
            typeName: toolType.name,
            unitCount: count(toolUnit.id),
            sampleLocation: sql<
              string | null
            >`max(${toolUnit.storageLocation})`,
          })
          .from(toolAsset)
          .innerJoin(toolType, eq(toolAsset.toolTypeId, toolType.id))
          .leftJoin(
            toolUnit,
            and(
              eq(toolUnit.toolAssetId, toolAsset.id),
              eq(toolUnit.active, true),
            ),
          )
          .where(
            and(
              eq(toolAsset.roomId, session.roomId),
              eq(toolAsset.active, true),
            ),
          )
          .groupBy(
            toolAsset.id,
            toolAsset.assetCode,
            toolAsset.condition,
            toolType.name,
          ),
      ]);

      const toInsert = [];
      for (const b of roomBatches) {
        if (!existingBatchIds.has(b.id)) {
          toInsert.push({
            sessionId: id,
            itemType: "MATERIAL" as const,
            materialBatchId: b.id,
            instrumentAssetId: null,
            instrumentUnitId: null,
            toolAssetId: null,
            toolUnitId: null,
            baselineQuantity: b.quantity,
            countedQuantity: b.quantity,
            condition: null,
            storageLocation: b.storageLocation ?? null,
            entrySource: "SYSTEM_PLANNED" as const,
            countedById: session.startedById,
          });
        }
      }

      for (const a of roomInstruments) {
        if (!existingInsAssetIds.has(a.assetId)) {
          toInsert.push({
            sessionId: id,
            itemType: "INSTRUMENT" as const,
            materialBatchId: null,
            instrumentAssetId: a.assetId,
            instrumentUnitId: null,
            toolAssetId: null,
            toolUnitId: null,
            baselineQuantity: String(a.unitCount),
            countedQuantity: String(a.unitCount),
            condition: a.condition ?? "GOOD",
            storageLocation: a.sampleLocation ?? "Gudang Instrumen",
            entrySource: "SYSTEM_PLANNED" as const,
            countedById: session.startedById,
          });
        }
      }

      for (const a of roomTools) {
        if (!existingToolAssetIds.has(a.assetId)) {
          toInsert.push({
            sessionId: id,
            itemType: "TOOL" as const,
            materialBatchId: null,
            instrumentAssetId: null,
            instrumentUnitId: null,
            toolAssetId: a.assetId,
            toolUnitId: null,
            baselineQuantity: String(a.unitCount),
            countedQuantity: String(a.unitCount),
            condition: a.condition ?? "GOOD",
            storageLocation: a.sampleLocation ?? "Meja Praktikum 1-4",
            entrySource: "SYSTEM_PLANNED" as const,
            countedById: session.startedById,
          });
        }
      }

      if (toInsert.length > 0) {
        await tx
          .insert(stockOpnameEntry)
          .values(toInsert)
          .onConflictDoNothing();
      }
    });
  }

  const rows = await db
    .select({
      id: stockOpnameEntry.id,
      itemType: stockOpnameEntry.itemType,
      materialBatchId: stockOpnameEntry.materialBatchId,
      instrumentAssetId: stockOpnameEntry.instrumentAssetId,
      instrumentUnitId: stockOpnameEntry.instrumentUnitId,
      toolAssetId: stockOpnameEntry.toolAssetId,
      toolUnitId: stockOpnameEntry.toolUnitId,
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
      // Instrument
      insAssetCode: instrumentAsset.assetCode,
      insAssetCondition: instrumentAsset.condition,
      insTypeName: instrumentType.name,
      insUnitCode: instrumentUnit.code,
      insUnitLabel: instrumentUnit.label,
      insUnitQr: instrumentUnit.qrCode,
      insUnitCondition: instrumentUnit.condition,
      insUnitLocation: instrumentUnit.storageLocation,
      // Tool
      toolAssetCode: toolAsset.assetCode,
      toolAssetCondition: toolAsset.condition,
      toolTypeName: toolType.name,
      toolUnitCode: toolUnit.code,
      toolUnitLabel: toolUnit.label,
      toolUnitQr: toolUnit.qrCode,
      toolUnitCondition: toolUnit.condition,
      toolUnitLocation: toolUnit.storageLocation,
    })
    .from(stockOpnameEntry)
    .leftJoin(
      materialBatch,
      eq(materialBatch.id, stockOpnameEntry.materialBatchId),
    )
    .leftJoin(material, eq(material.id, materialBatch.materialId))
    .leftJoin(
      instrumentUnit,
      eq(instrumentUnit.id, stockOpnameEntry.instrumentUnitId),
    )
    .leftJoin(
      instrumentAsset,
      sql`${instrumentAsset.id} = coalesce(${stockOpnameEntry.instrumentAssetId}, ${instrumentUnit.instrumentAssetId})`,
    )
    .leftJoin(
      instrumentType,
      eq(instrumentType.id, instrumentAsset.instrumentTypeId),
    )
    .leftJoin(toolUnit, eq(toolUnit.id, stockOpnameEntry.toolUnitId))
    .leftJoin(
      toolAsset,
      sql`${toolAsset.id} = coalesce(${stockOpnameEntry.toolAssetId}, ${toolUnit.toolAssetId})`,
    )
    .leftJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
    .innerJoin(user, eq(user.id, stockOpnameEntry.countedById))
    .where(
      and(
        eq(stockOpnameEntry.sessionId, id),
        isNull(stockOpnameEntry.instrumentUnitId),
        isNull(stockOpnameEntry.toolUnitId),
      ),
    )
    .orderBy(asc(stockOpnameEntry.itemType), asc(stockOpnameEntry.countedAt));

  const entries: OpnameEntryRow[] = rows.map((row) => {
    const isMaterial = row.itemType === "MATERIAL";
    const isInstrument = row.itemType === "INSTRUMENT";
    const baseline = Number(row.baselineQuantity);
    const counted = Number(row.countedQuantity);

    const assetCode = isInstrument
      ? (row.insAssetCode ?? row.insUnitCode)
      : (row.toolAssetCode ?? row.toolUnitCode);
    const code = isMaterial ? (row.matCode ?? "-") : (assetCode ?? "-");
    const name = isMaterial
      ? (row.matName ?? "-")
      : isInstrument
        ? (row.insTypeName ?? "-")
        : (row.toolTypeName ?? "-");
    const lotNumber = isMaterial
      ? row.batchLot
      : `${assetCode} (${baseline} unit)`;
    const qrCode = isMaterial
      ? row.batchQr
      : isInstrument
        ? (row.insAssetCode ?? row.insUnitQr)
        : (row.toolAssetCode ?? row.toolUnitQr);
    const unit = isMaterial ? (row.matUnit ?? "satuan") : "unit";
    const storageLocation =
      row.entryStorageLocation ??
      (isMaterial
        ? row.batchLocation
        : isInstrument
          ? (row.insUnitLocation ?? "Gudang Instrumen")
          : (row.toolUnitLocation ?? "Meja Praktikum 1-4"));
    const condition = isMaterial
      ? null
      : (row.entryCondition ??
        (isInstrument
          ? (row.insAssetCondition ?? row.insUnitCondition)
          : (row.toolAssetCondition ?? row.toolUnitCondition)) ??
        "GOOD");

    return {
      id: row.id,
      itemType: row.itemType,
      materialBatchId: row.materialBatchId,
      instrumentAssetId: row.instrumentAssetId,
      instrumentUnitId: row.instrumentUnitId,
      toolAssetId: row.toolAssetId,
      toolUnitId: row.toolUnitId,
      equipmentAssetId: row.instrumentAssetId ?? row.toolAssetId,
      equipmentUnitId: row.instrumentUnitId ?? row.toolUnitId,
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
    (entry) =>
      Math.abs(entry.difference) > 1e-9 || entry.condition === "DAMAGED",
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

    // Idempotency guard: if this completed session has already been reconciled,
    // return early so repeated clicks or retries cannot double-adjust units or
    // emit duplicate audit entries.
    const [existingReconciliation] = await tx
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, "stock_opname_session"),
          eq(auditLog.entityId, session.id),
          eq(auditLog.action, "ADJUST_STOCK"),
        ),
      )
      .limit(1);
    if (existingReconciliation) {
      return {
        sessionId: session.id,
        reconciledCount: 0,
        alreadyReconciled: true,
      };
    }

    const entries = await tx
      .select({
        id: stockOpnameEntry.id,
        itemType: stockOpnameEntry.itemType,
        materialBatchId: stockOpnameEntry.materialBatchId,
        instrumentAssetId: stockOpnameEntry.instrumentAssetId,
        instrumentUnitId: stockOpnameEntry.instrumentUnitId,
        toolAssetId: stockOpnameEntry.toolAssetId,
        toolUnitId: stockOpnameEntry.toolUnitId,
        baselineQuantity: stockOpnameEntry.baselineQuantity,
        countedQuantity: stockOpnameEntry.countedQuantity,
        condition: stockOpnameEntry.condition,
        entrySource: stockOpnameEntry.entrySource,
        varianceReason: stockOpnameEntry.varianceReason,
        storageLocation: stockOpnameEntry.storageLocation,
        batchCurrentQty: materialBatch.quantity,
        insUnitCurrentCondition: instrumentUnit.condition,
        insUnitCurrentStatus: instrumentUnit.status,
        toolUnitCurrentCondition: toolUnit.condition,
        toolUnitCurrentStatus: toolUnit.status,
      })
      .from(stockOpnameEntry)
      .leftJoin(
        materialBatch,
        eq(materialBatch.id, stockOpnameEntry.materialBatchId),
      )
      .leftJoin(
        instrumentUnit,
        eq(instrumentUnit.id, stockOpnameEntry.instrumentUnitId),
      )
      .leftJoin(toolUnit, eq(toolUnit.id, stockOpnameEntry.toolUnitId))
      .where(eq(stockOpnameEntry.sessionId, sessionId))
      .for("update");

    let reconciledCount = 0;
    for (const entry of entries) {
      const counted = Number(entry.countedQuantity);

      // --- RECONCILE INSTRUMENT ASSETS ---
      if (entry.instrumentAssetId) {
        const activeUnits = await tx
          .select({
            id: instrumentUnit.id,
            code: instrumentUnit.code,
            condition: instrumentUnit.condition,
            status: instrumentUnit.status,
          })
          .from(instrumentUnit)
          .where(
            and(
              eq(instrumentUnit.instrumentAssetId, entry.instrumentAssetId),
              eq(instrumentUnit.active, true),
            ),
          )
          .orderBy(asc(instrumentUnit.code));

        const newCondition = entry.condition ?? "GOOD";
        const targetCount = Math.max(0, Math.floor(counted));
        const currentCount = activeUnits.length;
        const diff = targetCount - currentCount;

        if (diff < 0) {
          const toMark = Math.abs(diff);
          for (let i = 0; i < toMark && i < activeUnits.length; i++) {
            const unit = activeUnits[activeUnits.length - 1 - i];
            await tx
              .update(instrumentUnit)
              .set({
                condition: newCondition === "GOOD" ? "DAMAGED" : newCondition,
                status: "DAMAGED",
                notes: `Selisih opname: unit berkurang saat sensus (${diff} unit)`,
                updatedAt: new Date(),
              })
              .where(eq(instrumentUnit.id, unit.id));
          }
        } else if (diff > 0) {
          const [assetRow] = await tx
            .select({ assetCode: instrumentAsset.assetCode })
            .from(instrumentAsset)
            .where(eq(instrumentAsset.id, entry.instrumentAssetId))
            .limit(1);

          for (let i = 0; i < diff; i++) {
            const unitCode = `${assetRow?.assetCode ?? "INS"}-U${currentCount + i + 1}`;
            await tx
              .insert(instrumentUnit)
              .values({
                instrumentAssetId: entry.instrumentAssetId,
                code: unitCode,
                label: `Unit ${unitCode}`,
                qrCode: `RK-INS-${unitCode}`,
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
          .update(instrumentAsset)
          .set({
            condition: newCondition,
            updatedAt: new Date(),
          })
          .where(eq(instrumentAsset.id, entry.instrumentAssetId));

        if (entry.storageLocation) {
          await tx
            .update(instrumentUnit)
            .set({ storageLocation: entry.storageLocation })
            .where(
              eq(instrumentUnit.instrumentAssetId, entry.instrumentAssetId),
            );
        }

        reconciledCount++;
        continue;
      }

      // --- RECONCILE TOOL ASSETS ---
      if (entry.toolAssetId) {
        const activeUnits = await tx
          .select({
            id: toolUnit.id,
            code: toolUnit.code,
            condition: toolUnit.condition,
            status: toolUnit.status,
          })
          .from(toolUnit)
          .where(
            and(
              eq(toolUnit.toolAssetId, entry.toolAssetId),
              eq(toolUnit.active, true),
            ),
          )
          .orderBy(asc(toolUnit.code));

        const newCondition = entry.condition ?? "GOOD";
        const targetCount = Math.max(0, Math.floor(counted));
        const currentCount = activeUnits.length;
        const diff = targetCount - currentCount;

        if (diff < 0) {
          const toMark = Math.abs(diff);
          for (let i = 0; i < toMark && i < activeUnits.length; i++) {
            const unit = activeUnits[activeUnits.length - 1 - i];
            await tx
              .update(toolUnit)
              .set({
                condition: newCondition === "GOOD" ? "DAMAGED" : newCondition,
                status: "DAMAGED",
                notes: `Selisih opname: unit berkurang saat sensus (${diff} unit)`,
                updatedAt: new Date(),
              })
              .where(eq(toolUnit.id, unit.id));
          }
        } else if (diff > 0) {
          const [assetRow] = await tx
            .select({ assetCode: toolAsset.assetCode })
            .from(toolAsset)
            .where(eq(toolAsset.id, entry.toolAssetId))
            .limit(1);

          for (let i = 0; i < diff; i++) {
            const unitCode = `${assetRow?.assetCode ?? "TOL"}-U${currentCount + i + 1}`;
            await tx
              .insert(toolUnit)
              .values({
                toolAssetId: entry.toolAssetId,
                code: unitCode,
                label: `Unit ${unitCode}`,
                qrCode: `RK-TOL-${unitCode}`,
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
          .update(toolAsset)
          .set({
            condition: newCondition,
            updatedAt: new Date(),
          })
          .where(eq(toolAsset.id, entry.toolAssetId));

        if (entry.storageLocation) {
          await tx
            .update(toolUnit)
            .set({ storageLocation: entry.storageLocation })
            .where(eq(toolUnit.toolAssetId, entry.toolAssetId));
        }

        reconciledCount++;
        continue;
      }

      // --- RECONCILE INSTRUMENT UNITS (LEGACY INDIVIDUAL UNITS) ---
      if (entry.instrumentUnitId) {
        let needsUpdate = false;
        const newCondition =
          entry.condition ?? entry.insUnitCurrentCondition ?? "GOOD";
        let newStatus = entry.insUnitCurrentStatus ?? "AVAILABLE";

        if (counted === 0 && entry.insUnitCurrentStatus !== "MAINTENANCE") {
          newStatus = "MAINTENANCE";
          needsUpdate = true;
        }

        if (
          newCondition === "DAMAGED" &&
          entry.insUnitCurrentStatus !== "DAMAGED"
        ) {
          newStatus = "DAMAGED";
          needsUpdate = true;
        } else if (newCondition !== entry.insUnitCurrentCondition) {
          needsUpdate = true;
        }

        if (entry.storageLocation) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          await tx
            .update(instrumentUnit)
            .set({
              condition: newCondition,
              status: newStatus,
              ...(entry.storageLocation
                ? { storageLocation: entry.storageLocation }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(instrumentUnit.id, entry.instrumentUnitId));

          reconciledCount++;
        }
        continue;
      }

      // --- RECONCILE TOOL UNITS (LEGACY INDIVIDUAL UNITS) ---
      if (entry.toolUnitId) {
        let needsUpdate = false;
        const newCondition =
          entry.condition ?? entry.toolUnitCurrentCondition ?? "GOOD";
        let newStatus = entry.toolUnitCurrentStatus ?? "AVAILABLE";

        if (counted === 0 && entry.toolUnitCurrentStatus !== "MAINTENANCE") {
          newStatus = "MAINTENANCE";
          needsUpdate = true;
        }

        if (
          newCondition === "DAMAGED" &&
          entry.toolUnitCurrentStatus !== "DAMAGED"
        ) {
          newStatus = "DAMAGED";
          needsUpdate = true;
        } else if (newCondition !== entry.toolUnitCurrentCondition) {
          needsUpdate = true;
        }

        if (entry.storageLocation) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          await tx
            .update(toolUnit)
            .set({
              condition: newCondition,
              status: newStatus,
              ...(entry.storageLocation
                ? { storageLocation: entry.storageLocation }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(toolUnit.id, entry.toolUnitId));

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
