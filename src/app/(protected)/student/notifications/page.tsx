import type { Metadata } from "next";
import { ReaksanSubpage } from "@/components/reaksan-subpage";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import { listNotifications } from "@/services/notifications.service";
import { notificationToView } from "@/services/view.service";

export const metadata: Metadata = { title: "Notifikasi · Reaksan" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function StudentNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);

  const result = await listNotifications(user.id, {
    limit,
    offset: (page - 1) * limit,
  });

  return (
    <ReaksanSubpage
      page="notifications"
      userName={user.name}
      month={currentScheduleMonth()}
      notifications={result.data.map(notificationToView)}
      pageNumber={page}
      totalPages={result.meta.totalPages}
    />
  );
}
