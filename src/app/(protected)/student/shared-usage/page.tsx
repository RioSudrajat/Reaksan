import type { Metadata } from "next";
import { ReaksanFlowPage } from "@/components/reaksan-flow-pages";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { loadSharedUsagePage } from "@/services/shared-usage.service";

export const metadata: Metadata = { title: "Shared usage" };

export default async function StudentSharedUsagePage() {
  const { user } = await requireSession();
  const [catalog, data] = await Promise.all([
    buildLabCatalog(),
    loadSharedUsagePage(user.id),
  ]);
  return (
    <ReaksanFlowPage
      kind="shared-usage"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
      sharedUsage={data}
    />
  );
}
