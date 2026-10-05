import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  RoleAccessBoard,
  type AccessMember,
} from "@/components/admin/access/role-access-board";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/session";
import { listAssignments } from "@/services/admin.service";
import { listRoleAccess } from "@/services/permissions.service";

export const metadata: Metadata = { title: "Peran & Hak Akses · Admin Reaksan" };

export default async function AdminRolesPage() {
  await requirePermission({ configuration: ["manage-any"] });
  const [roleAccess, userList, assignments] = await Promise.all([
    listRoleAccess(),
    auth.api.listUsers({
      headers: await headers(),
      query: { limit: 100, sortBy: "name", sortDirection: "asc" },
    }),
    listAssignments(),
  ]);
  const members: AccessMember[] = (userList.users ?? []).map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role ?? null,
  }));
  const plpAssignments = assignments.filter(
    (assignment) =>
      assignment.assignmentType === "PLP" && assignment.active,
  );

  return (
    <>
      <PageHeader
        eyebrow="Akses & Keamanan"
        title="Peran & Hak Akses Sistem"
        description="Konfigurasi matriks izin akses untuk peran Mahasiswa, PLP Laboratorium, dan Administrator. Perubahan hak akses berlaku langsung ke seluruh ekosistem Reaksan."
      />

      <RoleAccessBoard items={roleAccess} members={members} />

      <Panel
        context={`${plpAssignments.length} penugasan aktif`}
        title="Penugasan PLP per Laboratorium"
        className="mt-5"
      >
        {plpAssignments.length === 0 ? (
          <EmptyState
            title="Belum ada PLP yang ditugaskan"
            description="PLP hanya dapat memvalidasi dan mengelola laboratorium yang ditugaskan. Atur penugasan melalui menu Penugasan PLP."
            action={
              <Link
                href="/admin/assignments"
                className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#E5A020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
              >
                Atur Penugasan PLP
              </Link>
            }
          />
        ) : (
          <>
            <ul className="space-y-2">
              {plpAssignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EEEEEE] px-3 py-2"
                >
                  <span className="text-[12px] font-semibold text-[#212121]">
                    {assignment.userName}
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    {assignment.scopeType === "LABORATORY"
                      ? `Semua lab · ${assignment.scopeLabel}`
                      : assignment.scopeLabel}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link
                href="/admin/assignments"
                className="text-[12px] font-bold text-[#8D6500] hover:underline transition"
              >
                Kelola penugasan lab →
              </Link>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
