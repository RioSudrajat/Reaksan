import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { materialBatch, stockTransaction } from "@/db/schema";
import type { DbExecutor } from "@/services/executor";

export type BatchStockRow = {
  batchId: string;
  materialId: string;
  roomId: string;
  lotNumber: string | null;
  quantity: string;
  reserved: string;
  expiryDate: Date | null;
};

// Batch rows with their reserved allocation. Callers that need a consistent
// stock decision must run this inside the transaction that mutates it.
export async function listBatchStock(
  exec: DbExecutor,
  materialIds: string[],
  options: { forUpdate?: boolean } = {},
) {
  if (materialIds.length === 0) return [];
  const batchQuery = exec
    .select({
      batchId: materialBatch.id,
      materialId: materialBatch.materialId,
      roomId: materialBatch.roomId,
      lotNumber: materialBatch.lotNumber,
      quantity: materialBatch.quantity,
      expiryDate: materialBatch.expiryDate,
    })
    .from(materialBatch)
    .where(
      and(
        inArray(materialBatch.materialId, materialIds),
        eq(materialBatch.active, true),
      ),
    )
    .orderBy(asc(materialBatch.expiryDate), asc(materialBatch.createdAt));
  const batches = options.forUpdate
    ? await batchQuery.for("update")
    : await batchQuery;
  if (batches.length === 0) return [];

  // Reserved allocation is derived from stock transactions. Two plain queries
  // keep the aggregate unambiguous instead of interpolating columns into raw SQL.
  const reservations = await exec
    .select({
      batchId: stockTransaction.materialBatchId,
      reserved: sql<string>`COALESCE(SUM(CASE
        WHEN ${stockTransaction.type} = 'RESERVE' THEN ${stockTransaction.quantity}
        WHEN ${stockTransaction.type} IN ('RELEASE', 'ISSUE') THEN -${stockTransaction.quantity}
        ELSE 0
      END), 0)`,
    })
    .from(stockTransaction)
    .where(
      inArray(
        stockTransaction.materialBatchId,
        batches.map((batch) => batch.batchId),
      ),
    )
    .groupBy(stockTransaction.materialBatchId);
  const reservedByBatch = new Map(
    reservations.map((row) => [row.batchId, row.reserved]),
  );

  return batches.map<BatchStockRow>((batch) => ({
    ...batch,
    reserved: reservedByBatch.get(batch.batchId) ?? "0",
  }));
}

export function stockTotalsForMaterial(rows: BatchStockRow[], materialId: string) {
  const batches = rows.filter((row) => row.materialId === materialId);
  const sum = (pick: (row: BatchStockRow) => number) =>
    batches.reduce((total, row) => total + pick(row), 0);
  const physical = sum((row) => Number(row.quantity));
  const reserved = sum((row) => Number(row.reserved));
  return {
    physical,
    reserved: Math.max(0, reserved),
    available: Math.max(0, physical - reserved),
    batches,
  };
}

export type StockAllocation = {
  batchId: string;
  quantity: number;
  before: number;
  after: number;
};

// FEFO allocation: earliest expiry first, using only quantity that is not
// already reserved. Returns null when the batches cannot cover the request.
export function allocateStock(
  batches: BatchStockRow[],
  quantity: number,
): StockAllocation[] | null {
  let remaining = quantity;
  const allocations: StockAllocation[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const reserved = Number(batch.reserved);
    const free = Math.max(0, Number(batch.quantity) - reserved);
    if (free <= 0) continue;
    const take = Math.min(free, remaining);
    allocations.push({
      batchId: batch.batchId,
      quantity: take,
      before: reserved,
      after: reserved + take,
    });
    remaining -= take;
  }
  if (remaining > 0) return null;
  return allocations;
}

export async function recordStockTransaction(
  exec: DbExecutor,
  input: {
    batchId: string;
    type: (typeof stockTransaction.$inferInsert)["type"];
    quantity: number;
    before: number;
    after: number;
    referenceType: string;
    referenceId: string;
    performedById: string;
    reason?: string;
  },
) {
  await exec.insert(stockTransaction).values({
    materialBatchId: input.batchId,
    type: input.type,
    quantity: input.quantity.toFixed(3),
    beforeQuantity: input.before.toFixed(3),
    afterQuantity: input.after.toFixed(3),
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    performedById: input.performedById,
    reason: input.reason,
  });
}

export async function findBatchById(exec: DbExecutor, batchId: string) {
  const [batch] = await exec
    .select()
    .from(materialBatch)
    .where(eq(materialBatch.id, batchId))
    .limit(1);
  return batch;
}

export { db };
