import type { Metadata } from "next";
import { headers } from "next/headers";
import { UserRoleForm } from "@/components/admin/user-role-form";
import {
  EmptyState,
  PageHeader,
  Panel,
  formatDateTime,
} from "@/components/workspace";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requirePermission({ configuration: ["manage-any"] });
  const result = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
  });
  const users = result.users ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Akses"
        title="Users"
        description="Lihat akun dan ubah role-nya. Perubahan role langsung berlaku pada request berikutnya dan tercatat di audit."
      />
      <Panel context={`${users.length} akun`} title="Daftar akun" padded={false}>
        {users.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada akun"
              description="Akun dibuat lewat halaman sign-up."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {users.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#212121]">
                    {account.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[#6B6B6B]">
                    {account.email}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                    Terdaftar {formatDateTime(account.createdAt)} · role{" "}
                    {account.role ?? "user"}
                  </p>
                </div>
                <UserRoleForm
                  userId={account.id}
                  email={account.email}
                  currentRole={account.role ?? "user"}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
