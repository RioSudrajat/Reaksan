import { withApiSession } from "@/lib/api";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/services/notifications.service";
import { listNotificationsSchema } from "@/validators/notifications";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = listNotificationsSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const [result, unread] = await Promise.all([
      listNotifications(session.user.id, query),
      countUnreadNotifications(session.user.id),
    ]);
    return Response.json({ ...result, meta: { ...result.meta, unread } });
  });
}
