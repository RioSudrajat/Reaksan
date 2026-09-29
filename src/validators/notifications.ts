import { z } from "zod";

export const notificationIdSchema = z.string().uuid();

export const listNotificationsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
