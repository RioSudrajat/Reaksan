import { z } from "zod";
import { entityCodeSchema } from "./catalog";

const title = z.string().trim().min(1).max(160);
const purpose = z.string().trim().min(1).max(2000);
const person = z.string().trim().max(160);

export const equipmentRequestItemSchema = z
  .object({
    unitCode: entityCodeSchema,
    purpose: z.string().trim().max(500).optional(),
  })
  .strict();

export const materialRequestItemSchema = z
  .object({
    materialCode: entityCodeSchema,
    quantity: z.number().positive().max(1_000_000),
  })
  .strict();

export const createRequestSchema = z
  .object({
    title,
    purpose,
    roomCode: entityCodeSchema,
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    supervisor: person.default(""),
    fieldPic: person.default(""),
    equipment: z.array(equipmentRequestItemSchema).max(20).default([]),
    materials: z.array(materialRequestItemSchema).max(20).default([]),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.startAt).getTime() < new Date(value.endAt).getTime(),
    { path: ["endAt"], message: "End time must be after the start time." },
  )
  .refine(
    (value) =>
      new Set(value.equipment.map((item) => item.unitCode)).size ===
      value.equipment.length,
    { path: ["equipment"], message: "A unit can only be added once." },
  )
  .refine(
    (value) =>
      new Set(value.materials.map((item) => item.materialCode)).size ===
      value.materials.length,
    { path: ["materials"], message: "A material can only be added once." },
  );

export const requestIdSchema = z.string().uuid();

export const reviewRequestSchema = z
  .object({
    action: z.enum(["approve", "reject", "revision"]),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();

export const wasteItemSchema = z
  .object({
    containerId: z.string().uuid(),
    chemicalDescription: z.string().trim().min(2).max(500),
    quantity: z.number().positive().max(1000),
    unit: z.string().trim().default("L"),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const unitConditionItemSchema = z
  .object({
    unitId: z.string().optional(),
    unitCode: entityCodeSchema,
    unitName: z.string().optional(),
    condition: z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const incidentItemSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(5).max(2000),
    severity: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .default("MEDIUM"),
    equipmentCode: entityCodeSchema.optional(),
  })
  .strict();

export const returnRequestSchema = z
  .object({
    condition: z
      .enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"])
      .default("GOOD"),
    notes: z.string().trim().max(2000).default(""),
    unitConditions: z.array(unitConditionItemSchema).optional(),
    unitStatuses: z
      .array(
        z.object({
          unitId: z.string().optional(),
          unitCode: entityCodeSchema.optional(),
          status: z.enum(["AVAILABLE", "MAINTENANCE"]),
          notes: z.string().trim().max(1000).optional(),
        }),
      )
      .optional(),
    incident: incidentItemSchema.optional(),
    incidents: z.array(incidentItemSchema).optional(),
    waste: wasteItemSchema.optional(),
    wastes: z.array(wasteItemSchema).optional(),
  })
  .strict();

export const studentReturnSchema = z
  .object({
    condition: z.enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"]),
    notes: z.string().trim().max(2000).default(""),
    unitConditions: z.array(unitConditionItemSchema).optional(),
    incident: incidentItemSchema.optional(),
    incidents: z.array(incidentItemSchema).optional(),
    waste: wasteItemSchema.optional(),
    wastes: z.array(wasteItemSchema).optional(),
  })
  .strict();

export const confirmReturnSchema = z
  .object({
    notes: z.string().trim().max(2000).default(""),
    equipmentStatus: z.enum(["AVAILABLE", "MAINTENANCE"]).default("AVAILABLE"),
    unitStatuses: z
      .array(
        z.object({
          unitId: z.string().optional(),
          unitCode: entityCodeSchema.optional(),
          status: z.enum(["AVAILABLE", "MAINTENANCE"]),
          notes: z.string().trim().max(1000).optional(),
        }),
      )
      .optional(),
    wasteVerification: z
      .object({
        logId: z.string().uuid(),
        status: z.enum(["VERIFIED", "REJECTED"]).default("VERIFIED"),
        quantity: z.number().positive().optional(),
        containerId: z.string().uuid().optional(),
        notes: z.string().trim().max(1000).optional(),
      })
      .optional(),
    wasteVerifications: z
      .array(
        z.object({
          logId: z.string().uuid(),
          status: z.enum(["VERIFIED", "REJECTED"]).default("VERIFIED"),
          quantity: z.number().positive().optional(),
          containerId: z.string().uuid().optional(),
          notes: z.string().trim().max(1000).optional(),
        }),
      )
      .optional(),
  })
  .strict();

export const rejectReturnSchema = z
  .object({
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type EquipmentRequestItemInput = z.infer<
  typeof equipmentRequestItemSchema
>;
export type MaterialRequestItemInput = z.infer<
  typeof materialRequestItemSchema
>;
export type StudentReturnInput = z.infer<typeof studentReturnSchema>;
export type ConfirmReturnInput = z.infer<typeof confirmReturnSchema>;
export type RejectReturnInput = z.infer<typeof rejectReturnSchema>;
