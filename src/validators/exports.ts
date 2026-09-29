import { z } from "zod";
import { entityCodeSchema } from "./catalog";
import { incidentSeverityValues, incidentStatusValues } from "./plp";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date such as 2026-09-01.");

export const exportReportNames = [
  "inventory-batches",
  "low-stock",
  "stock-transactions",
  "issue-return",
  "incidents",
  "audit",
  "opname-variance",
] as const;

export type ExportReport = (typeof exportReportNames)[number];

export const inventoryBatchExportQuerySchema = z
  .object({
    room: entityCodeSchema.optional(),
    material: entityCodeSchema.optional(),
    expiringBefore: isoDate.optional(),
  })
  .strict();

export const lowStockExportQuerySchema = z.object({}).strict();

export const stockTransactionExportQuerySchema = z
  .object({
    batchId: z.string().uuid().optional(),
    material: entityCodeSchema.optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const issueReturnExportQuerySchema = z
  .object({
    request: z.string().trim().max(64).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const incidentExportQuerySchema = z
  .object({
    status: z.enum(incidentStatusValues).optional(),
    severity: z.enum(incidentSeverityValues).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const auditExportQuerySchema = z
  .object({
    entityType: z.string().trim().max(64).optional(),
    action: z.string().trim().max(64).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const opnameVarianceExportQuerySchema = z
  .object({ sessionId: z.string().uuid() })
  .strict();
