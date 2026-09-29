import { z } from "zod";

export const createSharedUsageSchema = z
  .object({
    reservationId: z.string().uuid(),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    purpose: z.string().trim().max(1000).default(""),
  })
  .strict()
  .refine(
    (value) => new Date(value.startAt).getTime() < new Date(value.endAt).getTime(),
    { path: ["endAt"], message: "End time must be after the start time." },
  );

export const respondSharedUsageSchema = z
  .object({ action: z.enum(["accept", "decline"]) })
  .strict();

export const sharedUsageIdSchema = z.string().uuid();

export type CreateSharedUsageInput = z.infer<typeof createSharedUsageSchema>;
export type RespondSharedUsageInput = z.infer<
  typeof respondSharedUsageSchema
>;
