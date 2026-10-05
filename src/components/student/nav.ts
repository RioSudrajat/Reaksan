import type { NavGroup } from "@/components/workspace-shell";

export function studentNav(counts?: {
  incidents?: number;
  unread?: number;
}): NavGroup[] {
  return [
    {
      label: "Ruang Kerja",
      items: [
        {
          label: "Dashboard",
          href: "/student",
          icon: "dashboard",
        },
        {
          label: "Kalender Saya",
          href: "/student/calendar",
          icon: "schedule",
        },
      ],
    },
    {
      label: "Bantuan & Layanan",
      items: [
        {
          label: "Laporan Kendala",
          href: "/student/incidents",
          icon: "incidents",
          badge:
            counts?.incidents && counts.incidents > 0
              ? counts.incidents
              : undefined,
        },
        {
          label: "Notifikasi",
          href: "/student/notifications",
          icon: "notifications",
          badge: counts?.unread && counts.unread > 0 ? counts.unread : undefined,
        },
      ],
    },
  ];
}
