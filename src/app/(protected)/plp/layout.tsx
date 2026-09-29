import type { Metadata } from "next";
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
  const scope = await getRoomScope(user.id, user.role);
  const counts = await getPlpBadgeCounts(user.id, scopeRoomCodes(scope));
  return (
    <WorkspaceShell
      nav={plpNav(counts)}
      userName={user.name}
      roleLabel="PLP operator"
      accountHref="/plp/notifications"
      unreadCount={counts.unread}
    >
      {!scope.all && scope.roomCodes.length === 0 && (
        <div className="mb-5 rounded-2xl border border-[#F3D9A5] bg-[#FFF4D9] p-4 text-[13px] leading-5 text-[#6B5B2E]">
          <p className="font-semibold text-[#212121]">
            Belum ada lab yang ditugaskan
          </p>
          <p className="mt-1">
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
