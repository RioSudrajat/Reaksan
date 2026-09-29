import type { Metadata } from "next";
import { WorkspaceNotifications } from "@/components/plp/notifications";
import { PageHeader, Panel } from "@/components/workspace";
import { notificationToView } from "@/services/view.service";
import { requirePermission } from "@/lib/session";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/services/notifications.service";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function PlpNotificationsPage() {
  const { user } = await requirePermission({ plp: ["view"] });
  const [page, unread] = await Promise.all([
    listNotifications(user.id, { limit: 50, offset: 0 }),
    countUnreadNotifications(user.id),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Notifikasi"
        description="Request baru, fulfillment, dan incident yang perlu tindakanmu."
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
