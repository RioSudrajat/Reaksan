import type { Metadata } from "next";
import { UserCreateDialog } from "@/components/admin/user-create-dialog";
import { UserList } from "@/components/admin/user-list";
import {
  EmptyState,
  PageHeader,
  Pagination,
  Panel,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { listUsersAdmin } from "@/services/admin.service";

export const metadata: Metadata = {
  title: "Manajemen Pengguna · Admin Reaksan",
};

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user: currentUser } = await requirePermission({
    configuration: ["manage-any"],
  });

  const params = await searchParams;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const search = pick(params, "search");
  const role = pick(params, "role") || "all";
  const limit = 25;

  const result = await listUsersAdmin({
    search,
    role,
    limit,
    offset: (page - 1) * limit,
  });

  return (
    <>
      <PageHeader
        eyebrow="Akses & Keamanan"
        title="Manajemen Pengguna"
        description="Kelola akun pengguna, daftarkan akun baru, atur peranan (Mahasiswa, PLP, Admin), ubah kata sandi, atau tinjau detail profil civitas akademika."
      />
      <Panel
        context={`${result.meta.total} akun terdaftar`}
        title="Daftar Akun Pengguna"
        action={<UserCreateDialog />}
        padded={false}
      >
        {result.meta.total === 0 && !search && role === "all" ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada akun"
              description="Belum ada akun pengguna terdaftar. Klik tombol Tambah Pengguna di atas untuk mendaftarkan akun baru."
              action={<UserCreateDialog />}
            />
          </div>
        ) : (
          <UserList
            key={`${search ?? ""}-${role}`}
            users={result.data}
            currentUserId={currentUser.id}
            currentRole={role}
            currentSearch={search}
          />
        )}
      </Panel>

      <Pagination
        basePath="/admin/users"
        query={{
          search,
          role: role !== "all" ? role : undefined,
        }}
        page={page}
        totalPages={result.meta.totalPages}
      />
    </>
  );
}
