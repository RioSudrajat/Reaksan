import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { studentNav } from "@/components/student/nav";
import { requireSession } from "@/lib/session";
import { listMyIncidents } from "@/services/incidents.service";
import { countUnreadNotifications } from "@/services/notifications.service";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Ruang Mahasiswa · Reaksan" };

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  const roles = (user.role ?? "").split(",").map((s) => s.trim());
  if (roles.includes("admin")) redirect("/admin/dashboard");
  if (roles.includes("plp")) redirect("/plp/dashboard");
  const [unread, incidents] = await Promise.all([
    countUnreadNotifications(user.id),
    listMyIncidents(user.id),
  ]);
  const activeIncidents = incidents.filter(
    (item) => item.status !== "RESOLVED",
  ).length;

  return (
    <WorkspaceShell
      nav={studentNav({ unread, incidents: activeIncidents })}
      userName={user.name}
      userEmail={user.email}
      roleLabel="Mahasiswa"
      accountHref="/student/notifications"
      unreadCount={unread}
    >
      {children}
    </WorkspaceShell>
  );
}
