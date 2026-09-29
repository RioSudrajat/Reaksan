import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { buildLabCatalog } from "@/services/catalog.service";
import { countUnreadNotifications } from "@/services/notifications.service";

export const metadata: Metadata = { title: "Equipment" };

export default async function StudentEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const { user } = await requireSession();
  const [catalog, unread] = await Promise.all([
    buildLabCatalog(),
    countUnreadNotifications(user.id),
  ]);
  return (
    <ReaksanSubpage
      page="equipment"
      userName={user.name}
      catalog={catalog}
      month={currentScheduleMonth()}
      unreadCount={unread}
      initialRoom={room}
    />
  );
}
