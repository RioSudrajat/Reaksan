import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { adminNav } from "@/components/admin/nav";
import { requirePermission } from "@/lib/session";
import { countUnreadNotifications } from "@/services/notifications.service";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Ruang Administrator · Reaksan" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePermission({ configuration: ["manage-any"] });
  const roles = (user.role ?? "").split(",").map((s) => s.trim());
  if (!roles.includes("admin")) {
    if (roles.includes("plp")) redirect("/plp/dashboard");
    redirect("/student");
  }
  const unread = await countUnreadNotifications(user.id);
  return (
    <WorkspaceShell
      nav={adminNav}
      userName={user.name}
      userEmail={user.email}
      roleLabel="Administrator"
      accountHref="/admin/notifications"
      unreadCount={unread}
    >
      {children}
    </WorkspaceShell>
  );
}
