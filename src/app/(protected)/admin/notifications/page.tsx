import type { Metadata } from "next";
import { WorkspaceNotifications } from "@/components/plp/notifications";
import { PageHeader, Pagination, Panel } from "@/components/workspace";
import { notificationToView } from "@/services/view.service";
import { requirePermission } from "@/lib/session";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/services/notifications.service";

export const metadata: Metadata = {
  title: "Notifikasi Sistem · Admin Reaksan",
};

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ configuration: ["manage-any"] });
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);

  const [notificationPage, unread] = await Promise.all([
    listNotifications(user.id, { limit, offset: (page - 1) * limit }),
    countUnreadNotifications(user.id),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Operasional & Aktivitas"
        title="Pusat Pemberitahuan Sistem"
        description="Pemberitahuan aktivitas operasional, permohonan baru, pelaporan insiden, dan pembaruan sistem yang membutuhkan perhatian administrator."
      />
      <Panel>
        <WorkspaceNotifications
          notifications={notificationPage.data.map(notificationToView)}
          unread={unread}
        />
      </Panel>

      <Pagination
        basePath="/admin/notifications"
        page={page}
        totalPages={notificationPage.meta.totalPages}
      />
    </>
  );
}
