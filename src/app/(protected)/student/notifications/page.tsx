import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/services/notifications.service";
import { notificationToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Notifications" };

export default async function StudentNotificationsPage() {
  const { user } = await requireSession();
  const [catalog, result, unread] = await Promise.all([
    buildLabCatalog(),
    listNotifications(user.id, { limit: 50, offset: 0 }),
    countUnreadNotifications(user.id),
  ]);
  return (
    <ReaksanSubpage
      page="notifications"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
      unreadCount={unread}
      notifications={result.data.map(notificationToView)}
    />
  );
}
