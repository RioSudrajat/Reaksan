import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { plpNav } from "@/components/plp/nav";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { getPlpBadgeCounts } from "@/services/plp.service";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "PLP Workspace" };

export default async function PlpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const roles = (user.role ?? "").split(",").map((s) => s.trim());
  if (roles.includes("admin")) redirect("/admin/dashboard");
  if (!roles.includes("plp")) redirect("/student");
  const scope = await getRoomScope(user.id, user.role);
  const counts = await getPlpBadgeCounts(user.id, scopeRoomCodes(scope));
  return (
    <WorkspaceShell
      nav={plpNav(counts)}
      userName={user.name}
      userEmail={user.email}
      roleLabel="PLP Laboratorium"
      accountHref="/plp/notifications"
      unreadCount={counts.unread}
    >
      {!scope.all && scope.roomCodes.length === 0 && (
        <div className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FEF7E6] p-4 text-[13px] leading-5 text-[#8D6500]">
          <p className="font-bold text-[#121826]">
            Belum ada lab yang ditugaskan
          </p>
          <p className="mt-1 text-[#8D6500]/90">
            Akun Anda belum punya penugasan lab, jadi data operasional
            disembunyikan. Hubungi administrator untuk mengatur penugasan PLP
            per lab di halaman Assignments.
          </p>
        </div>
      )}
      {children}
    </WorkspaceShell>
  );
}
