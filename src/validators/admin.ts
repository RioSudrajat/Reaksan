import { z } from "zod";
import { entityCodeSchema } from "./catalog";

const name = z.string().trim().min(2).max(120);
const description = z.string().trim().max(2000);
const optionalDescription = description.optional();
const requiredCode = entityCodeSchema;

export const laboratoryInputSchema = z
  .object({
    code: requiredCode,
    name,
    description: optionalDescription,
    active: z.boolean().optional(),
  })
  .strict();

export const roomInputSchema = z
  .object({
    laboratoryCode: requiredCode,
    code: requiredCode,
    name,
    shortName: z.string().trim().min(1).max(60),
    description: optionalDescription,
    floor: z.string().trim().max(40).optional(),
    tone: z.enum(["yellow", "blue", "green", "cream", "rose"]).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const equipmentTypeInputSchema = z
  .object({
    name,
    category: z.string().trim().max(80).optional(),
    description: optionalDescription,
    usageType: z.enum(["BORROWABLE", "USAGE_ONLY"]),
    active: z.boolean().optional(),
  })
  .strict();

export const equipmentAssetInputSchema = z
  .object({
    equipmentTypeId: z.string().uuid(),
    roomCode: requiredCode,
    assetCode: requiredCode,
    serialNumber: z.string().trim().max(120).optional().or(z.literal("")),
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
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    active: z.boolean().optional(),
  })
  .strict();

export const equipmentUnitInputSchema = z
  .object({
    assetCode: requiredCode,
    code: requiredCode,
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
      .optional(),
    condition: z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    active: z.boolean().optional(),
  })
  .strict();

export const dispensingRuleInputSchema = z
  .object({
    minimumQuantity: z.number().positive().max(1_000_000),
    dispensingIncrement: z.number().positive().max(1_000_000),
    maximumQuantity: z.number().positive().max(1_000_000),
    unit: z.string().trim().min(1).max(24),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.minimumQuantity <= value.maximumQuantity, {
    path: ["minimumQuantity"],
    message: "Minimum cannot be larger than maximum.",
  });

export const materialInputSchema = z
  .object({
    code: requiredCode,
    name,
    category: z.string().trim().max(80).optional(),
    baseUnit: z.string().trim().min(1).max(24),
    description: optionalDescription,
    active: z.boolean().optional(),
    rule: dispensingRuleInputSchema.optional(),
  })
  .strict();

export const materialBatchInputSchema = z
  .object({
    materialCode: requiredCode,
    roomCode: requiredCode,
    lotNumber: z.string().trim().max(80).optional(),
    quantity: z.number().min(0).max(10_000_000),
    expiryDate: z.iso.datetime({ offset: true }).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const assignmentInputSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    scopeType: z.enum(["LABORATORY", "ROOM", "ACTIVITY"]),
    scopeId: z.string().trim().min(1).max(64),
    assignmentType: z.enum(["PLP", "ASLAB", "PIC"]),
    startDate: z.iso.datetime({ offset: true }).optional(),
    endDate: z.iso.datetime({ offset: true }).optional(),
    notes: z.string().trim().max(1000).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const settingsInputSchema = z
  .object({
    cancellation_lead_time_minutes: z.number().int().min(0).max(10080).optional(),
    low_stock_ratio: z.number().min(0.1).max(10).optional(),
    timezone: z.string().trim().min(3).max(64).optional(),
    notification_policy: z
      .object({
        request_submitted: z.boolean(),
        request_decision: z.boolean(),
        incident_reported: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Change at least one setting.",
  });

export const userRoleInputSchema = z
  .object({
    // Better Auth stores several roles as a comma-separated string; the union
    // of their permissions applies.
    roles: z
      .array(z.enum(["user", "plp", "lecturer", "aslab", "admin"]))
      .min(1)
      .max(5)
      .refine((values) => new Set(values).size === values.length, {
        message: "Peran tidak boleh duplikat.",
      }),
  })
  .strict();

export const rolePermissionsInputSchema = z
  .object({
    permissions: z.record(
      z.string().trim().min(1).max(64),
      z.array(z.string().trim().min(1).max(64)).max(64),
    ),
  })
  .strict();

const partial = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
  schema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "Change at least one field.",
  });

export const laboratoryUpdateSchema = partial(laboratoryInputSchema);
export const roomUpdateSchema = partial(roomInputSchema);
export const equipmentTypeUpdateSchema = partial(equipmentTypeInputSchema);
export const equipmentAssetUpdateSchema = partial(equipmentAssetInputSchema);
export const equipmentUnitUpdateSchema = partial(equipmentUnitInputSchema);
export const materialUpdateSchema = partial(materialInputSchema);
export const materialBatchUpdateSchema = partial(materialBatchInputSchema);
export const assignmentUpdateSchema = partial(assignmentInputSchema);

export type LaboratoryInput = z.infer<typeof laboratoryInputSchema>;
export type RoomInput = z.infer<typeof roomInputSchema>;
export type EquipmentTypeInput = z.infer<typeof equipmentTypeInputSchema>;
export type EquipmentAssetInput = z.infer<typeof equipmentAssetInputSchema>;
export type EquipmentUnitInput = z.infer<typeof equipmentUnitInputSchema>;
export type MaterialInput = z.infer<typeof materialInputSchema>;
export type MaterialBatchInput = z.infer<typeof materialBatchInputSchema>;
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
