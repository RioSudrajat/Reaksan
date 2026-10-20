import type { Metadata } from "next";
import { ReaksanDashboard } from "@/components/reaksan-dashboard";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { listMyIncidents } from "@/services/incidents.service";
import { countUnreadNotifications } from "@/services/notifications.service";
import { listMyRequests } from "@/services/requests.service";
import { listConfirmedSharedUsage } from "@/services/shared-usage.service";
import { buildCalendarEvents, incidentToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Dashboard Mahasiswa · Reaksan" };

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { user } = await requireSession();
  const [params, catalog, requests, shared, incidents, unread] =
    await Promise.all([
      searchParams,
      buildLabCatalog(),
      listMyRequests(user.id),
      listConfirmedSharedUsage(user.id),
      listMyIncidents(user.id),
      countUnreadNotifications(user.id),
    ]);
  const month = currentScheduleMonth();
  return (
    <ReaksanDashboard
      key={params.search ?? ""}
      userName={user.name}
      catalog={catalog}
      events={buildCalendarEvents({
        requests,
        shared,
        month,
        viewerId: user.id,
      })}
      unreadCount={unread}
      latestIncident={incidents[0] ? incidentToView(incidents[0]) : null}
      initialSearch={params.search ?? ""}
    />
  );
}
