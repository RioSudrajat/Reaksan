import { ApiError, withApiSession } from "@/lib/api";
import { markNotificationRead } from "@/services/notifications.service";
import { notificationIdSchema } from "@/validators/notifications";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = notificationIdSchema.parse((await context.params).id);
    const updated = await markNotificationRead(session.user.id, id);
    if (!updated)
      throw new ApiError(404, "NOT_FOUND", "Notification not found.");
    return Response.json({ data: { id } });
  });
}
