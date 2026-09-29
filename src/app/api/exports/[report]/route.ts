import { ApiError, withApiPermission, withApiSession } from "@/lib/api";
import { db } from "@/db";
import type { Permissions } from "@/lib/permissions";
import {
  assertOpnameInScope,
  scopeForSession,
  type RoomScope,
} from "@/services/access-scope.service";
import { writeAudit } from "@/services/audit.service";
import {
  exportAudit,
  exportIncidents,
  exportInventoryBatches,
  exportIssueReturn,
  exportLowStock,
  exportOpnameVariance,
  exportStockTransactions,
} from "@/services/export.service";
import {
  auditExportQuerySchema,
  incidentExportQuerySchema,
  inventoryBatchExportQuerySchema,
  issueReturnExportQuerySchema,
  lowStockExportQuerySchema,
  opnameVarianceExportQuerySchema,
  stockTransactionExportQuerySchema,
  type ExportReport,
} from "@/validators/exports";

export const runtime = "nodejs";
type Context = { params: Promise<{ report: string }> };

const guards: Record<ExportReport, Permissions> = {
  "inventory-batches": { inventory: ["read-any"] },
  "low-stock": { inventory: ["read-any"] },
  "stock-transactions": { inventory: ["read-any"] },
  "opname-variance": { inventory: ["read-any"] },
  "issue-return": { requests: ["read-any"] },
  incidents: { incidents: ["read-any"] },
  audit: { audit: ["read-any"] },
};

async function buildReport(
  report: ExportReport,
  params: Record<string, string>,
  roomCodes: string[] | null,
  scope: RoomScope,
) {
  switch (report) {
    case "inventory-batches": {
      const query = inventoryBatchExportQuerySchema.parse(params);
      return {
        result: await exportInventoryBatches(
          {
            roomCode: query.room,
            materialCode: query.material,
            expiringBefore: query.expiringBefore,
          },
          roomCodes,
        ),
        filters: query,
      };
    }
    case "low-stock": {
      const query = lowStockExportQuerySchema.parse(params);
      return { result: await exportLowStock(roomCodes), filters: query };
    }
    case "stock-transactions": {
      const query = stockTransactionExportQuerySchema.parse(params);
      return {
        result: await exportStockTransactions(
          {
            batchId: query.batchId,
            materialCode: query.material,
            from: query.from,
            to: query.to,
          },
          roomCodes,
        ),
        filters: query,
      };
    }
    case "issue-return": {
      const query = issueReturnExportQuerySchema.parse(params);
      return {
        result: await exportIssueReturn(
          {
            requestCode: query.request,
            from: query.from,
            to: query.to,
          },
          roomCodes,
        ),
        filters: query,
      };
    }
    case "incidents": {
      const query = incidentExportQuerySchema.parse(params);
      return {
        result: await exportIncidents(
          {
            status: query.status,
            severity: query.severity,
            from: query.from,
            to: query.to,
          },
          roomCodes,
        ),
        filters: query,
      };
    }
    case "audit": {
      const query = auditExportQuerySchema.parse(params);
      return {
        result: await exportAudit(
          {
            entityType: query.entityType,
            action: query.action,
            from: query.from,
            to: query.to,
          },
          roomCodes,
        ),
        filters: query,
      };
    }
    case "opname-variance": {
      const query = opnameVarianceExportQuerySchema.parse(params);
      await assertOpnameInScope(scope, query.sessionId);
      return {
        result: await exportOpnameVariance(query.sessionId),
        filters: query,
      };
    }
  }
}

export async function GET(request: Request, context: Context) {
  const { report } = await context.params;
  const permissions = guards[report as ExportReport] as Permissions | undefined;
  if (!permissions) {
    return withApiSession(request, async () => {
      throw new ApiError(404, "NOT_FOUND", "Jenis laporan tidak dikenal.");
    });
  }
  return withApiPermission(request, permissions, async (session) => {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const { scope, roomCodes } = await scopeForSession(session);
    const { result, filters } = await buildReport(
      report as ExportReport,
      params,
      roomCodes,
      scope,
    );
    // Export reads are audited so a download has a named actor and filter set.
    await writeAudit(db, {
      actorId: session.user.id,
      action: "CREATE",
      entityType: "export",
      entityId: report,
      after: filters,
      reason: result.filename,
    });
    return new Response(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
