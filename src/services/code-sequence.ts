import "server-only";
import { sql } from "drizzle-orm";
import type { DbExecutor } from "@/services/executor";

type CodeTable = "resource_request" | "incident";

/**
 * Allocates the next `PREFIX-YYYY-NNN` code inside the caller's transaction.
 *
 * A transaction-scoped advisory lock serialises concurrent allocators for the
 * same prefix and year, so two submissions in the same millisecond cannot read
 * the same maximum. The lock is released automatically on commit or rollback.
 * Only purely numeric suffixes count, so imported codes such as
 * `REQ-2026-FIS-08` never shift the sequence.
 */
export async function nextYearlyCode(
  tx: DbExecutor,
  table: CodeTable,
  prefix: string,
  now = new Date(),
) {
  const year = now.getFullYear();
  const base = `${prefix}-${year}-`;
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`code:${table}:${base}`}))`,
  );
  const pattern = `^${prefix}-${year}-[0-9]+$`;
  const result = await tx.execute<{ max: number | null }>(
    sql`SELECT MAX(CAST(SUBSTRING(code FROM ${base.length + 1}) AS integer))::int AS max
        FROM ${sql.identifier(table)}
        WHERE code ~ ${pattern}`,
  );
  const current = Number(result.rows[0]?.max ?? 0);
  return `${base}${String(current + 1).padStart(3, "0")}`;
}
