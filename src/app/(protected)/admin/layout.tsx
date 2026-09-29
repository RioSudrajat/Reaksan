import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { adminNav } from "@/components/admin/nav";
import { requirePermission } from "@/lib/session";
import { countUnreadNotifications } from "@/services/notifications.service";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Admin Workspace" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePermission({ configuration: ["manage-any"] });
  const unread = await countUnreadNotifications(user.id);
  return (
    <WorkspaceShell
      nav={adminNav}
      userName={user.name}
      roleLabel="Administrator"
      accountHref="/plp/notifications"
      unreadCount={unread}
    >
      {children}
    </WorkspaceShell>
  );
}
