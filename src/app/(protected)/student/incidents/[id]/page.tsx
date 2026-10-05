import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaksanFlowPage } from "@/components/reaksan-flow-pages";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { getMyIncident } from "@/services/incidents.service";
import { incidentToView } from "@/services/view.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Kendala ${id} · Reaksan` };
}

export default async function StudentIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSession();
  const [catalog, incident] = await Promise.all([
    buildLabCatalog(),
    getMyIncident(user.id, id),
  ]);
  if (!incident) notFound();
  return (
    <ReaksanFlowPage
      kind="incident-detail"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
      incident={incidentToView(incident)}
    />
  );
}
