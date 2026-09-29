import { withApiSession } from "@/lib/api";
import { markAllNotificationsRead } from "@/services/notifications.service";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    await markAllNotificationsRead(session.user.id);
    return Response.json({ data: { unread: 0 } });
  });
}
