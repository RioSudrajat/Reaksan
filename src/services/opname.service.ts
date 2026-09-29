import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  material,
  materialBatch,
  room,
  stockOpnameEntry,
  stockOpnameSession,
  user,
} from "@/db/schema";
import { writeAudit } from "@/services/audit.service";
import { recordStockTransaction } from "@/services/stock.service";

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
    const batches = await tx
      .select({
        id: materialBatch.id,
        quantity: materialBatch.quantity,
      })
      .from(materialBatch)
      .where(
        and(
          eq(materialBatch.roomId, roomRow.id),
          eq(materialBatch.active, true),
        ),
      );
    if (batches.length === 0)
      throw new ApiError(
        409,
        "NO_BATCHES",
        "Room ini belum punya batch aktif untuk dihitung.",
      );
    const [session] = await tx
      .insert(stockOpnameSession)
      .values({
        roomId: roomRow.id,
        startedById: actorId,
        notes: input.notes ?? null,
      })
      .returning();
    await tx.insert(stockOpnameEntry).values(
      batches.map((batch) => ({
        sessionId: session.id,
        materialBatchId: batch.id,
        baselineQuantity: batch.quantity,
        countedQuantity: batch.quantity,
        countedById: actorId,
      })),
    );
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "stock_opname_session",
      entityId: session.id,
      after: { room: roomRow.code, batches: batches.length },
    });
    return session;
  });
}

export async function recordOpnameCount(
  actorId: string,
  sessionId: string,
  input: { materialBatchId: string; countedQuantity: number; notes?: string },
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
    const [entry] = await tx
      .select()
      .from(stockOpnameEntry)
      .where(
        and(
          eq(stockOpnameEntry.sessionId, sessionId),
          eq(stockOpnameEntry.materialBatchId, input.materialBatchId),
        ),
      )
      .limit(1);
    if (!entry)
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Batch tidak termasuk dalam sesi ini.",
      );
    const [updated] = await tx
      .update(stockOpnameEntry)
      .set({
        countedQuantity: input.countedQuantity.toFixed(3),
        countedById: actorId,
        countedAt: new Date(),
        notes: input.notes === undefined ? entry.notes : input.notes,
      })
      .where(eq(stockOpnameEntry.id, entry.id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "stock_opname_entry",
      entityId: entry.id,
      before: { countedQuantity: Number(entry.countedQuantity) },
      after: { countedQuantity: input.countedQuantity },
    });
    return updated;
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
  materialBatchId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  lotNumber: string | null;
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
  const rows = await db
    .select({
      id: stockOpnameEntry.id,
      materialBatchId: stockOpnameEntry.materialBatchId,
      materialCode: material.code,
      materialName: material.name,
      unit: material.baseUnit,
      lotNumber: materialBatch.lotNumber,
      expiryDate: materialBatch.expiryDate,
      baselineQuantity: stockOpnameEntry.baselineQuantity,
      countedQuantity: stockOpnameEntry.countedQuantity,
      notes: stockOpnameEntry.notes,
      countedByName: user.name,
      countedAt: stockOpnameEntry.countedAt,
    })
    .from(stockOpnameEntry)
    .innerJoin(
      materialBatch,
      eq(materialBatch.id, stockOpnameEntry.materialBatchId),
    )
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(user, eq(user.id, stockOpnameEntry.countedById))
    .where(eq(stockOpnameEntry.sessionId, id))
    .orderBy(asc(material.name), asc(materialBatch.expiryDate));
  const entries: OpnameEntryRow[] = rows.map((row) => {
    const baseline = Number(row.baselineQuantity);
    const counted = Number(row.countedQuantity);
    return {
      id: row.id,
      materialBatchId: row.materialBatchId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      unit: row.unit,
      lotNumber: row.lotNumber,
      expiryDate: row.expiryDate,
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
    (entry) => Math.abs(entry.difference) > 1e-9,
  ).length;
  const positiveTotal = session.entries.reduce(
    (total, entry) => total + Math.max(0, entry.difference),
    0,
  );
  const negativeTotal = session.entries.reduce(
    (total, entry) => total + Math.min(0, entry.difference),
    0,
  );
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
        materialBatchId: stockOpnameEntry.materialBatchId,
        baselineQuantity: stockOpnameEntry.baselineQuantity,
        countedQuantity: stockOpnameEntry.countedQuantity,
        batchCurrentQty: materialBatch.quantity,
      })
      .from(stockOpnameEntry)
      .innerJoin(
        materialBatch,
        eq(materialBatch.id, stockOpnameEntry.materialBatchId),
      )
      .where(eq(stockOpnameEntry.sessionId, sessionId))
      .for("update");

    let reconciledCount = 0;
    for (const entry of entries) {
      const counted = Number(entry.countedQuantity);
      const current = Number(entry.batchCurrentQty);
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
        })
        .where(eq(materialBatch.id, entry.materialBatchId));

      await recordStockTransaction(tx, {
        batchId: entry.materialBatchId,
        type: "ADJUST",
        quantity: Math.abs(diff),
        before: current,
        after: counted,
        referenceType: "stock_opname",
        referenceId: session.id,
        performedById: actorId,
        reason:
          options.reason ||
          `Rekonsiliasi otomatis opname sesi ${session.id} (selisih: ${diff > 0 ? "+" : ""}${diff})`,
      });

      reconciledCount++;
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

