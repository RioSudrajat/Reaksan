import { z } from "zod";
import { entityCodeSchema } from "./catalog";

export const createIncidentSchema = z
  .object({
    equipmentCode: entityCodeSchema.optional(),
    roomCode: entityCodeSchema.optional(),
    requestId: z.string().uuid().optional(),
    reservationId: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(5000),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.equipmentCode || value.roomCode), {
    path: ["equipmentCode"],
    message: "Choose the equipment or room this incident belongs to.",
  });

export const assessIncidentSchema = z
  .object({
    finding: z.string().trim().min(3).max(2000),
    assessment: z.string().trim().min(3).max(2000),
    recommendedAction: z.string().trim().max(1000).optional(),
    equipmentCondition: z
      .enum(["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"])
      .optional(),
    status: z.enum(["UNDER_ASSESSMENT", "IN_MAINTENANCE"]).optional(),
  })
  .strict();

export const resolveIncidentSchema = z
  .object({
    action: z.string().trim().min(3).max(2000),
    notes: z.string().trim().max(2000).optional(),
    equipmentStatus: z
      .enum(["AVAILABLE", "MAINTENANCE", "DAMAGED", "RETIRED"])
      .optional(),
  })
  .strict();

export const incidentCodeSchema = z
  .string()
  .trim()
  .regex(/^INC-\d{4}-\d{3,}$/i, "Use an incident code such as INC-2026-001.");

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type AssessIncidentInput = z.infer<typeof assessIncidentSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
