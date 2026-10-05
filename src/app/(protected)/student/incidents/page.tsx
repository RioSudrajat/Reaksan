import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { listMyIncidents } from "@/services/incidents.service";
import { incidentToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Laporan Kendala · Reaksan" };

export default async function StudentIncidentsPage() {
  const { user } = await requireSession();
  const incidents = await listMyIncidents(user.id);
  return (
    <ReaksanSubpage
      page="incidents"
      userName={user.name}
      month={currentScheduleMonth()}
      incidents={incidents.map(incidentToView)}
    />
  );
}
