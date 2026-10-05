// Plain-language copy for the access screen. Resource and action names come
// from the permission statement; admins should never have to read code names.

export const roleLabels: Record<string, string> = {
  user: "Mahasiswa (dasar)",
  plp: "PLP — operator lab",
  admin: "Administrator",
};

export const roleDescriptions: Record<string, string> = {
  user: "Akses dasar. Hanya mengelola request dan data miliknya sendiri.",
  plp: "Menangani permintaan, inventaris, dan insiden di lab yang ditugaskan.",
  admin: "Akses penuh: data master, akun, penugasan, dan konfigurasi.",
};

export const resourceLabels: Record<string, string> = {
  requests: "Permintaan & peminjaman",
  inventory: "Inventaris lab",
  schedule: "Jadwal",
  history: "Riwayat operasional",
  incidents: "Insiden",
  plp: "Area kerja PLP",
  labs: "Laboratorium",
  rooms: "Ruangan lab",
  equipment: "Alat",
  materials: "Bahan",
  assignments: "Penugasan lab",
  configuration: "Konfigurasi sistem",
  audit: "Log audit",
  notes: "Catatan",
  user: "Akun pengguna",
  session: "Sesi login",
};

// The edits admins can make. Better Auth's own account-security resources
// (user, session) stay admin-only and are shown as read-only.
export const editableResources = [
  "requests",
  "inventory",
  "schedule",
  "history",
  "incidents",
  "plp",
  "labs",
  "rooms",
  "equipment",
  "materials",
  "assignments",
  "configuration",
  "audit",
  "notes",
] as const;

export const permissionGroups: Array<{
  title: string;
  resources: string[];
}> = [
  {
    title: "Operasional lab",
    resources: ["requests", "inventory", "schedule", "history", "incidents", "plp"],
  },
  {
    title: "Data master",
    resources: ["labs", "rooms", "equipment", "materials", "assignments"],
  },
  {
    title: "Sistem",
    resources: ["configuration", "audit", "notes"],
  },
  {
    title: "Keamanan akun (khusus admin)",
    resources: ["user", "session"],
  },
];

const actionLabels: Record<string, Record<string, string>> = {
  requests: {
    "read-any": "Melihat permintaan semua lab",
    "review-any": "Meninjau dan memutuskan permintaan",
    "issue-any": "Menyerahkan alat atau bahan",
    "return-any": "Menerima pengembalian dan inspeksi",
  },
  inventory: {
    "read-any": "Melihat inventaris lab yang ditugaskan",
    "manage-any": "Menjalankan stok opname di lab yang ditugaskan",
  },
  schedule: { "read-any": "Melihat jadwal semua lab" },
  history: { "read-any": "Melihat riwayat operasional" },
  incidents: {
    "read-any": "Melihat laporan insiden",
    "assess-any": "Menilai laporan insiden",
    "resolve-any": "Menyelesaikan insiden",
  },
  plp: { view: "Membuka workspace PLP" },
  labs: { "manage-any": "Mengelola data laboratorium" },
  rooms: { "manage-any": "Mengelola data ruangan lab" },
  equipment: { "manage-any": "Mengelola alat dan unit" },
  materials: { "manage-any": "Mengelola bahan, batch, dan stok" },
  assignments: { "manage-any": "Mengatur penugasan per lab" },
  configuration: { "manage-any": "Mengubah konfigurasi sistem" },
  audit: { "read-any": "Membaca log audit" },
  notes: {
    "read-any": "Melihat catatan semua akun",
    "delete-any": "Menghapus catatan siapa pun",
  },
  user: {
    create: "Membuat akun pengguna",
    list: "Melihat daftar pengguna",
    "set-role": "Mengubah peran pengguna",
    ban: "Memblokir pengguna",
    impersonate: "Masuk sebagai pengguna",
    "impersonate-admins": "Masuk sebagai administrator",
    delete: "Menghapus pengguna",
    "set-password": "Mengatur ulang kata sandi",
    "set-email": "Mengubah email pengguna",
    get: "Melihat detail pengguna",
    update: "Memperbarui profil pengguna",
  },
  session: {
    list: "Melihat sesi login",
    revoke: "Mencabut sesi login",
    delete: "Menghapus sesi login",
  },
};

export function actionLabel(resource: string, action: string) {
  return (
    actionLabels[resource]?.[action] ??
    action
      .split("-")
      .map((part, index) =>
        index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
      )
      .join(" ")
  );
}
