import { z } from "zod";
import { entityCodeSchema } from "./catalog";

export const requestStatusValues = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_PLP",
  "REQUEST_REVISION",
  "APPROVED",
  "REJECTED",
  "READY_FOR_PICKUP",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "OVERDUE",
] as const;

export const incidentStatusValues = [
  "REPORTED",
  "UNDER_ASSESSMENT",
  "IN_MAINTENANCE",
  "RESOLVED",
] as const;

export const incidentSeverityValues = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date such as 2026-09-01.");

export const listPlpRequestsSchema = z
  .object({
    status: z.enum(requestStatusValues).optional(),
    room: entityCodeSchema.optional(),
    student: z.string().trim().max(160).optional(),
    activity: z.string().trim().max(160).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const requestIdParamSchema = z.string().uuid();

export const completeRequestSchema = z
  .object({
    notes: z.string().trim().max(2000).default(""),
    equipmentStatus: z.enum(["AVAILABLE", "MAINTENANCE"]).optional(),
    unitStatuses: z
      .array(
        z.object({
          unitId: z.string().uuid(),
          status: z.enum(["AVAILABLE", "MAINTENANCE"]),
        }),
      )
      .optional(),
  })
  .strict();

export const listPlpIncidentsSchema = z
  .object({
    status: z.enum(incidentStatusValues).optional(),
    severity: z.enum(incidentSeverityValues).optional(),
    room: entityCodeSchema.optional(),
    search: z.string().trim().max(160).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const inventoryQuerySchema = z
  .object({
    room: entityCodeSchema.optional(),
    status: z
      .enum([
        "AVAILABLE",
        "RESERVED",
        "IN_USE",
        "MAINTENANCE",
        "DAMAGED",
        "UNDER_INSPECTION",
        "RETIRED",
      ])
      .optional(),
    condition: z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]).optional(),
    usage: z.enum(["BORROWABLE", "USAGE_ONLY"]).optional(),
    stock: z.enum(["all", "low", "out"]).default("all"),
    expiry: z.enum(["all", "soon", "expired"]).default("all"),
    search: z.string().trim().max(160).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const scheduleViewSchema = z
  .object({
    room: entityCodeSchema.optional(),
    kind: z.enum(["all", "request", "reservation"]).default("all"),
  })
  .strict();

export const scheduleQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    room: entityCodeSchema.optional(),
    kind: z.enum(["all", "request", "reservation"]).default("all"),
  })
  .strict();

export const historyQuerySchema = z
  .object({
    entity: z.string().trim().max(64).optional(),
    action: z.string().trim().max(64).optional(),
    actor: z.string().trim().max(160).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type ListPlpRequestsInput = z.infer<typeof listPlpRequestsSchema>;
export type CompleteRequestInput = z.infer<typeof completeRequestSchema>;
export type ListPlpIncidentsInput = z.infer<typeof listPlpIncidentsSchema>;
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const plpEquipmentAssetInputSchema = z
  .object({
    equipmentTypeId: z.string().uuid(),
    roomCode: entityCodeSchema,
    assetCode: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(
        /^[A-Za-z0-9-_]+$/,
        "Gunakan huruf, angka, tanda hubung, atau garis bawah.",
      ),
    serialNumber: z.string().trim().max(120).optional(),
    status: z
      .enum([
        "AVAILABLE",
        "RESERVED",
        "IN_USE",
        "MAINTENANCE",
        "DAMAGED",
        "UNDER_INSPECTION",
        "RETIRED",
      ])
      .default("AVAILABLE"),
    condition: z
      .enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"])
      .default("GOOD"),
    notes: z.string().trim().max(2000).optional(),
    active: z.boolean().default(true),
  })
  .strict();

export const plpEquipmentUnitInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(
        /^[A-Za-z0-9-_]+$/,
        "Gunakan huruf, angka, tanda hubung, atau garis bawah.",
      ),
    label: z.string().trim().min(1).max(120),
    status: z
      .enum([
        "AVAILABLE",
        "RESERVED",
        "IN_USE",
        "MAINTENANCE",
        "DAMAGED",
        "UNDER_INSPECTION",
        "RETIRED",
      ])
      .default("AVAILABLE"),
    condition: z
      .enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"])
      .default("GOOD"),
    notes: z.string().trim().max(2000).optional(),
    active: z.boolean().default(true),
  })
  .strict();

export const plpMaterialBatchInputSchema = z
  .object({
    roomCode: entityCodeSchema,
    lotNumber: z.string().trim().max(120).optional(),
    quantity: z.coerce
      .number()
      .positive("Kuantitas harus lebih dari 0.")
      .max(1_000_000),
    expiryDate: isoDate.optional().nullable(),
    active: z.boolean().default(true),
  })
  .strict();

export const plpStockAdjustInputSchema = z
  .object({
    type: z.enum(["ADJUST", "EXPIRE"]).default("ADJUST"),
    deltaQuantity: z.coerce.number().refine((n) => n !== 0, {
      message: "Perubahan kuantitas tidak boleh 0.",
    }),
    reason: z.string().trim().min(3, "Alasan minimal 3 karakter.").max(500),
  })
  .strict();

export type PlpEquipmentAssetInput = z.infer<
  typeof plpEquipmentAssetInputSchema
>;
export type PlpEquipmentUnitInput = z.infer<typeof plpEquipmentUnitInputSchema>;
export type PlpMaterialBatchInput = z.infer<
  typeof plpMaterialBatchInputSchema
>;
export type PlpStockAdjustInput = z.infer<typeof plpStockAdjustInputSchema>;

