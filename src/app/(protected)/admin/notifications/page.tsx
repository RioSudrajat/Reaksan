import type { Metadata } from "next";
import { WorkspaceNotifications } from "@/components/plp/notifications";
import { PageHeader, Panel } from "@/components/workspace";
import { notificationToView } from "@/services/view.service";
import { requirePermission } from "@/lib/session";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/services/notifications.service";

export const metadata: Metadata = { title: "Notifikasi Sistem · Admin Reaksan" };

export default async function AdminNotificationsPage() {
  const { user } = await requirePermission({ configuration: ["manage-any"] });
  const [page, unread] = await Promise.all([
    listNotifications(user.id, { limit: 50, offset: 0 }),
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
          notifications={page.data.map(notificationToView)}
          unread={unread}
        />
      </Panel>
    </>
  );
}
