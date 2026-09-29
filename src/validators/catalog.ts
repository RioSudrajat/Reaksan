import { z } from "zod";

export const entityCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and dashes only.");

export const roomQuerySchema = z
  .object({ room: entityCodeSchema.optional() })
  .strict();

export type RoomQuery = z.infer<typeof roomQuerySchema>;
