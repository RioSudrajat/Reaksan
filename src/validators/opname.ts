import { z } from "zod";
import { entityCodeSchema } from "./catalog";

export const opnameStatusValues = [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const opnameEntrySourceValues = [
  "SYSTEM_PLANNED",
  "GRANT_HIBAH",
  "LEFTOVER_RETURN",
  "DISCOVERY_FOUND",
] as const;

export const opnameVarianceReasonValues = [
  "NORMAL_EVAPORATION",
  "SPILL_DAMAGE",
  "EXPIRED_SPOILED",
  "RETURNED_LEFTOVER",
  "GRANT_INTAKE",
  "COUNT_CORRECTION",
  "OTHER",
] as const;

export const opnameSessionInputSchema = z
  .object({
    roomCode: entityCodeSchema,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const opnameCountInputSchema = z
  .object({
    entryId: z.string().uuid().optional(),
    materialBatchId: z.string().uuid().optional(),
    equipmentUnitId: z.string().uuid().optional(),
    equipmentAssetId: z.string().uuid().optional(),
    countedQuantity: z.number().finite().min(0).max(10_000_000),
    condition: z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]).optional(),
    varianceReason: z.enum(opnameVarianceReasonValues).optional(),
    storageLocation: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const opnameAddIntakeInputSchema = z
  .object({
    materialId: z.string().uuid().optional(),
    newMaterial: z
      .object({
        name: z.string().trim().min(1).max(100),
        code: z.string().trim().min(1).max(50),
        baseUnit: z.string().trim().min(1).max(20).default("mL"),
        category: z.string().trim().max(50).optional(),
      })
      .optional(),
    countedQuantity: z.number().finite().positive().max(10_000_000),
    lotNumber: z.string().trim().max(100).optional(),
    expiryDate: z.string().datetime().optional().nullable(),
    storageLocation: z.string().trim().max(100).optional().nullable(),
    entrySource: z
      .enum(["GRANT_HIBAH", "LEFTOVER_RETURN", "DISCOVERY_FOUND"])
      .default("GRANT_HIBAH"),
    varianceReason: z.enum(opnameVarianceReasonValues).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.materialId || data.newMaterial), {
    message: "Pilih master bahan atau isi data bahan baru.",
    path: ["materialId"],
  });

export const opnameCompleteSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

function emptyToUndefined(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

export const opnameListQuerySchema = z
  .object({
    room: z.preprocess(emptyToUndefined, entityCodeSchema.optional()),
    status: z.preprocess(emptyToUndefined, z.enum(opnameStatusValues).optional()),
    page: z.preprocess(
      (val) => (val === "" || val === undefined ? 1 : val),
      z.coerce.number().int().min(1).max(1_000_000).default(1),
    ),
    limit: z.preprocess(
      (val) => (val === "" || val === undefined ? 25 : val),
      z.coerce.number().int().min(1).max(100).default(25),
    ),
  })
  .strict();

export type OpnameSessionInput = z.infer<typeof opnameSessionInputSchema>;
export type OpnameCountInput = z.infer<typeof opnameCountInputSchema>;
export type OpnameAddIntakeInput = z.infer<typeof opnameAddIntakeInputSchema>;
export type OpnameListQuery = z.infer<typeof opnameListQuerySchema>;
