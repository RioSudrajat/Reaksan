import type { Metadata } from "next";
import { headers } from "next/headers";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { UserCreateDialog } from "@/components/admin/user-create-dialog";
import {
  EmptyState,
  PageHeader,
  Panel,
  formatDateTime,
} from "@/components/workspace";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Manajemen Pengguna · Admin Reaksan" };

export default async function AdminUsersPage() {
  const { user: currentUser } = await requirePermission({ configuration: ["manage-any"] });
  const result = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
  });
  const users = result.users ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Akses & Keamanan"
        title="Manajemen Pengguna"
        description="Kelola akun pengguna, daftarkan akun baru, atur peranan (Mahasiswa, PLP, Admin), atau hapus akun. Pendaftaran akun dikelola secara terpusat oleh Admin Laboratorium."
      />
      <Panel
        context={`${users.length} akun`}
        title="Daftar Akun Pengguna"
        action={<UserCreateDialog />}
        padded={false}
      >
        {users.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada akun"
              description="Belum ada akun pengguna terdaftar. Klik tombol Tambah Pengguna di atas untuk mendaftarkan akun baru."
              action={<UserCreateDialog />}
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
                  isSelf={account.id === currentUser.id}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
