import type { Metadata } from "next";
import { ReaksanFlowPage } from "@/components/reaksan-flow-pages";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";

export const metadata: Metadata = { title: "Report incident" };

export default async function StudentIncidentNewPage() {
  const { user } = await requireSession();
  const catalog = await buildLabCatalog();
  return (
    <ReaksanFlowPage
      kind="incident-new"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
    />
  );
}
