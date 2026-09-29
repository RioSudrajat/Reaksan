import "server-only";
import { auditLog } from "@/db/schema";
import type { DbExecutor } from "@/services/executor";

type AuditEntry = {
  actorId: string | null;
  action: (typeof auditLog.$inferInsert)["action"];
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

// Audit rows are append-only and written inside the same transaction as the
// mutation they describe, so a rollback never leaves a misleading history.
export async function writeAudit(exec: DbExecutor, entry: AuditEntry) {
  await exec.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeData: entry.before ?? null,
    afterData: entry.after ?? null,
    reason: entry.reason,
  });
}
