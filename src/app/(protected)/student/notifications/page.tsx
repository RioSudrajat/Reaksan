import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { listNotifications } from "@/services/notifications.service";
import { notificationToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Notifikasi · Reaksan" };

export default async function StudentNotificationsPage() {
  const { user } = await requireSession();
  const result = await listNotifications(user.id, { limit: 50, offset: 0 });
  return (
    <ReaksanSubpage
      page="notifications"
      userName={user.name}
      month={currentScheduleMonth()}
      notifications={result.data.map(notificationToView)}
    />
  );
}
