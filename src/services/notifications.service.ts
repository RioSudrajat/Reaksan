import "server-only";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { notification, user } from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import type { ListNotificationsInput } from "@/validators/notifications";

type NotificationInput = {
  recipientId: string;
  type: (typeof notification.$inferInsert)["type"];
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
};

export async function createNotification(
  exec: DbExecutor,
  input: NotificationInput,
) {
  const [created] = await exec
    .insert(notification)
    .values({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    })
    .returning({ id: notification.id });
  return created;
}

export async function createNotifications(
  exec: DbExecutor,
  inputs: NotificationInput[],
) {
  if (inputs.length === 0) return;
  await exec.insert(notification).values(
    inputs.map((input) => ({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    })),
  );
}

// PLP and admin accounts receive operational notifications. Roles are stored as
// a comma-separated string by Better Auth's admin plugin.
export async function listStaffRecipients(exec: DbExecutor) {
  const rows = await exec
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        ne(user.banned, true),
        or(sql`${user.role} LIKE '%plp%'`, sql`${user.role} LIKE '%admin%'`),
      ),
    );
  return rows.map((row) => row.id);
}

export async function listNotifications(
  userId: string,
  { limit, offset }: ListNotificationsInput,
) {
  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.recipientId, userId))
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(eq(notification.recipientId, userId), isNull(notification.readAt)),
    );
  return row?.count ?? 0;
}

export async function markNotificationRead(userId: string, id: string) {
  const [updated] = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.id, id),
        eq(notification.recipientId, userId),
        isNull(notification.readAt),
      ),
    )
    .returning({ id: notification.id });
  if (updated) return updated;
  const [existing] = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.id, id), eq(notification.recipientId, userId)))
    .limit(1);
  return existing;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(eq(notification.recipientId, userId), isNull(notification.readAt)),
    );
}
