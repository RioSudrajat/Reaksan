import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
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

// Operational notifications go to admins (who oversee every lab) plus staff
// whose active PLP/PIC assignment covers the room, either directly or through
// the room's laboratory. This mirrors getRoomScope, so nobody is notified about
// a lab they cannot open. Without a room (legacy callers) every PLP is included.
export async function listStaffRecipients(
  exec: DbExecutor,
  roomId?: string | null,
) {
  const notBanned = sql`coalesce(${user.banned}, false) = false`;
  if (!roomId) {
    const rows = await exec
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          notBanned,
          or(sql`${user.role} LIKE '%plp%'`, sql`${user.role} LIKE '%admin%'`),
        ),
      );
    return rows.map((row) => row.id);
  }
  const result = await exec.execute<{ id: string }>(sql`
    SELECT u.id AS id
    FROM "user" u
    WHERE coalesce(u.banned, false) = false
      AND (
        u.role LIKE '%admin%'
        OR EXISTS (
          SELECT 1
          FROM assignment a
          JOIN room r ON r.id = ${roomId}
          LEFT JOIN laboratory l ON l.id = r.laboratory_id
          WHERE a.user_id = u.id
            AND a.active
            AND a.assignment_type IN ('PLP', 'PIC')
            AND (a.start_date IS NULL OR a.start_date <= now())
            AND (a.end_date IS NULL OR a.end_date >= now())
            AND (
              (a.scope_type = 'ROOM' AND a.scope_id = r.code)
              OR (a.scope_type = 'LABORATORY' AND a.scope_id = l.code)
            )
        )
      )
  `);
  return result.rows.map((row) => row.id);
}

export async function listNotifications(
  userId: string,
  { limit, offset }: ListNotificationsInput,
) {
  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(notification)
      .where(eq(notification.recipientId, userId))
      .orderBy(desc(notification.createdAt), desc(notification.id))
      .limit(limit + 1)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notification)
      .where(eq(notification.recipientId, userId)),
  ]);
  const total = countRow[0]?.count ?? 0;
  return {
    data: rows.slice(0, limit),
    meta: {
      limit,
      offset,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: rows.length > limit,
    },
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
