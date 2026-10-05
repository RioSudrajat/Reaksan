import type { NavGroup } from "@/components/workspace-shell";

export const adminNav: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
      { label: "Jadwal & Agenda", href: "/admin/schedule", icon: "schedule" },
    ],
  },
  {
    label: "Akses & Pengguna",
    items: [
      { label: "Pengguna", href: "/admin/users", icon: "users" },
      { label: "Peran & Hak Akses", href: "/admin/roles", icon: "roles" },
    ],
  },
  {
    label: "Data Master",
    items: [
      { label: "Laboratorium", href: "/admin/laboratories", icon: "labs" },
      { label: "Ruangan Lab", href: "/admin/rooms", icon: "rooms" },
    ],
  },
  {
    label: "Operasional & Sistem",
    items: [
      { label: "Penugasan PLP", href: "/admin/assignments", icon: "assignments" },
      { label: "Konfigurasi Sistem", href: "/admin/configuration", icon: "configuration" },
      { label: "Log Audit", href: "/admin/audit-logs", icon: "audit" },
      { label: "Notifikasi", href: "/admin/notifications", icon: "notifications" },
    ],
  },
];
