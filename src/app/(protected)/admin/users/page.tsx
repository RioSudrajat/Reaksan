import type { Metadata } from "next";
import { UserCreateDialog } from "@/components/admin/user-create-dialog";
import { UserList } from "@/components/admin/user-list";
import { EmptyState, PageHeader, Panel } from "@/components/workspace";
import { db } from "@/db";
import { user } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = {
  title: "Manajemen Pengguna · Admin Reaksan",
};

export default async function AdminUsersPage() {
  const { user: currentUser } = await requirePermission({
    configuration: ["manage-any"],
  });

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return (
    <>
      <PageHeader
        eyebrow="Akses & Keamanan"
        title="Manajemen Pengguna"
        description="Kelola akun pengguna, daftarkan akun baru, atur peranan (Mahasiswa, PLP, Admin), ubah kata sandi, atau tinjau detail profil civitas akademika."
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
          <UserList users={users} currentUserId={currentUser.id} />
        )}
      </Panel>
    </>
  );
}
