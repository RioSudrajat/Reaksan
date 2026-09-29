import { z } from "zod";
import { entityCodeSchema } from "./catalog";

export const opnameStatusValues = [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const opnameSessionInputSchema = z
  .object({
    roomCode: entityCodeSchema,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const opnameCountInputSchema = z
  .object({
    materialBatchId: z.string().uuid(),
    countedQuantity: z.number().finite().min(0).max(10_000_000),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const opnameCompleteSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const opnameListQuerySchema = z
  .object({
    room: entityCodeSchema.optional(),
    status: z.enum(opnameStatusValues).optional(),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export type OpnameSessionInput = z.infer<typeof opnameSessionInputSchema>;
export type OpnameCountInput = z.infer<typeof opnameCountInputSchema>;
export type OpnameListQuery = z.infer<typeof opnameListQuerySchema>;
