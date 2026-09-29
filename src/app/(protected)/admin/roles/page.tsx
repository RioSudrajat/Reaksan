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

export const metadata: Metadata = { title: "Peran & akses" };

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
        eyebrow="Akses"
        title="Peran & akses"
        description="Atur apa yang boleh dilakukan tiap peran dalam bahasa sehari-hari, lihat siapa saja anggotanya, dan periksa penanggung jawab tiap lab."
      />

      <RoleAccessBoard items={roleAccess} members={members} />

      <Panel
        context={`${plpAssignments.length} penugasan aktif`}
        title="PLP per lab"
        className="mt-5"
      >
        {plpAssignments.length === 0 ? (
          <EmptyState
            title="Belum ada PLP yang ditugaskan"
            description="PLP hanya melihat lab yang ditugaskan. Tambahkan penugasan lewat halaman Assignments."
            action={
              <Link
                href="/admin/assignments"
                className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Atur penugasan
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
                className="text-[11px] font-bold text-[#38529B]"
              >
                Kelola penugasan lab
              </Link>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
