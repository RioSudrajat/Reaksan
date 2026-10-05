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

function emptyToUndefined(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

export const listPlpRequestsSchema = z
  .object({
    status: z.preprocess(emptyToUndefined, z.enum(requestStatusValues).optional()),
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    student: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
    activity: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
    from: z.preprocess(emptyToUndefined, isoDate.optional()),
    to: z.preprocess(emptyToUndefined, isoDate.optional()),
    limit: z.preprocess(
      (val) => (val === "" || val === undefined ? 25 : val),
      z.coerce.number().int().min(1).max(100).default(25),
    ),
    offset: z.preprocess(
      (val) => (val === "" || val === undefined ? 0 : val),
      z.coerce.number().int().min(0).max(1_000_000).default(0),
    ),
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
    status: z.preprocess(emptyToUndefined, z.enum(incidentStatusValues).optional()),
    severity: z.preprocess(emptyToUndefined, z.enum(incidentSeverityValues).optional()),
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
    limit: z.preprocess(
      (val) => (val === "" || val === undefined ? 25 : val),
      z.coerce.number().int().min(1).max(100).default(25),
    ),
    offset: z.preprocess(
      (val) => (val === "" || val === undefined ? 0 : val),
      z.coerce.number().int().min(0).max(1_000_000).default(0),
    ),
  })
  .strict();

export const inventoryQuerySchema = z
  .object({
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    classification: z.preprocess(
      emptyToUndefined,
      z.enum(["INSTRUMENT", "TOOL"]).optional(),
    ),
    status: z.preprocess(
      emptyToUndefined,
      z
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
    ),
    condition: z.preprocess(
      emptyToUndefined,
      z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]).optional(),
    ),
    usage: z.preprocess(
      emptyToUndefined,
      z.enum(["BORROWABLE", "USAGE_ONLY"]).optional(),
    ),
    stock: z.preprocess(
      (val) => (val === "" || val === undefined ? "all" : val),
      z.enum(["all", "low", "out"]).default("all"),
    ),
    expiry: z.preprocess(
      (val) => (val === "" || val === undefined ? "all" : val),
      z.enum(["all", "soon", "expired"]).default("all"),
    ),
    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(160).optional(),
    ),
    limit: z.preprocess(
      (val) => (val === "" || val === undefined ? 50 : val),
      z.coerce.number().int().min(1).max(200).default(50),
    ),
    offset: z.preprocess(
      (val) => (val === "" || val === undefined ? 0 : val),
      z.coerce.number().int().min(0).max(1_000_000).default(0),
    ),
  })
  .strict();

export const scheduleViewSchema = z
  .object({
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    kind: z.preprocess(
      (val) => (val === "" || val === undefined ? "all" : val),
      z.enum(["all", "request", "reservation"]).default("all"),
    ),
  })
  .strict();

export const scheduleQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    kind: z.preprocess(
      (val) => (val === "" || val === undefined ? "all" : val),
      z.enum(["all", "request", "reservation"]).default("all"),
    ),
  })
  .strict();

export const historyQuerySchema = z
  .object({
    entity: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
    action: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
    actor: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
    from: z.preprocess(emptyToUndefined, isoDate.optional()),
    to: z.preprocess(emptyToUndefined, isoDate.optional()),
    limit: z.preprocess(
      (val) => (val === "" || val === undefined ? 25 : val),
      z.coerce.number().int().min(1).max(100).default(25),
    ),
    offset: z.preprocess(
      (val) => (val === "" || val === undefined ? 0 : val),
      z.coerce.number().int().min(0).max(1_000_000).default(0),
    ),
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
    equipmentTypeId: z.string().uuid().optional(),
    newType: z
      .object({
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().max(80).optional(),
        classification: z.enum(["INSTRUMENT", "TOOL"]).default("INSTRUMENT"),
        usageType: z.enum(["BORROWABLE", "USAGE_ONLY"]).default("USAGE_ONLY"),
        imageMediaId: z.string().uuid().optional().nullable(),
      })
      .optional(),
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
    unitCount: z.coerce.number().int().min(1).max(100).default(1),
    serialNumber: z.string().trim().max(120).optional(),
    storageLocation: z.string().trim().max(120).optional(),
    imageMediaId: z.string().uuid().optional().nullable(),
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
  .refine((data) => data.equipmentTypeId || data.newType, {
    message: "Pilih tipe equipment atau masukkan tipe baru.",
    path: ["equipmentTypeId"],
  });

export const plpMaterialCreateInputSchema = z
  .object({
    code: entityCodeSchema,
    name: z.string().trim().min(1).max(160),
    category: z.string().trim().max(80).optional(),
    baseUnit: z.string().trim().min(1).max(32),
    description: z.string().trim().max(1000).optional(),
    imageMediaId: z.string().uuid().optional().nullable(),
    initialBatch: z
      .object({
        roomCode: entityCodeSchema,
        lotNumber: z.string().trim().max(120).optional(),
        storageLocation: z.string().trim().max(120).optional(),
        quantity: z.coerce
          .number()
          .positive("Kuantitas harus lebih dari 0.")
          .max(1_000_000),
        expiryDate: isoDate.optional().nullable(),
        source: z.enum(["PURCHASE", "GRANT_HIBAH", "LEFTOVER"]).default("PURCHASE"),
      })
      .optional(),
  })
  .strict();

export type PlpMaterialCreateInput = z.infer<typeof plpMaterialCreateInputSchema>;

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
    storageLocation: z.string().trim().max(120).optional(),
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
    storageLocation: z.string().trim().max(120).optional(),
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

