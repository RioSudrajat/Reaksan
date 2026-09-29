import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { listMyIncidents } from "@/services/incidents.service";
import { countUnreadNotifications } from "@/services/notifications.service";
import { incidentToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Incidents" };

export default async function StudentIncidentsPage() {
  const { user } = await requireSession();
  const [catalog, incidents, unread] = await Promise.all([
    buildLabCatalog(),
    listMyIncidents(user.id),
    countUnreadNotifications(user.id),
  ]);
  return (
    <ReaksanSubpage
      page="incidents"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
      unreadCount={unread}
      incidents={incidents.map(incidentToView)}
    />
  );
}
