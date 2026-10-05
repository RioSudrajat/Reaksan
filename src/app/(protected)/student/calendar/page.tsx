import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { listMyRequests } from "@/services/requests.service";
import { listConfirmedSharedUsage } from "@/services/shared-usage.service";
import { buildCalendarEvents, scheduleMonths } from "@/services/view.service";

export const metadata: Metadata = { title: "Kalender Saya · Reaksan" };

export default async function StudentCalendarPage() {
  const { user } = await requireSession();
  const [requests, shared] = await Promise.all([
    listMyRequests(user.id),
    listConfirmedSharedUsage(user.id),
  ]);
  const month = currentScheduleMonth();
  return (
    <ReaksanSubpage
      page="calendar"
      userName={user.name}
      month={month}
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
