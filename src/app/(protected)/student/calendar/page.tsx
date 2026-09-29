import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { countUnreadNotifications } from "@/services/notifications.service";
import { listMyRequests } from "@/services/requests.service";
import { listConfirmedSharedUsage } from "@/services/shared-usage.service";
import { buildCalendarEvents, scheduleMonths } from "@/services/view.service";

export const metadata: Metadata = { title: "My calendar" };

export default async function StudentCalendarPage() {
  const { user } = await requireSession();
  const [catalog, requests, shared, unread] = await Promise.all([
    buildLabCatalog(),
    listMyRequests(user.id),
    listConfirmedSharedUsage(user.id),
    countUnreadNotifications(user.id),
  ]);
  const month = currentScheduleMonth();
  return (
    <ReaksanSubpage
      page="calendar"
      userName={user.name}
      catalog={catalog}
      month={month}
      unreadCount={unread}
      events={buildCalendarEvents({
        requests,
        shared,
        month,
        months: scheduleMonths(month),
        viewerId: user.id,
      })}
    />
  );
}
