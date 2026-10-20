import type { NavGroup } from "@/components/workspace-shell";

export function plpNav(counts: {
  pending: number;
  issue?: number;
  returns: number;
}): NavGroup[] {
  return [
    {
      label: "Operasional",
      items: [
        {
          label: "Dashboard",
          href: "/plp/dashboard",
          icon: "dashboard",
        },
        {
          label: "Jadwal Lab",
          href: "/plp/schedule",
          icon: "schedule",
        },
      ],
    },
    {
      label: "Peminjaman & Permohonan",
      items: [
        {
          label: "Tinjau Permohonan",
          href: "/plp/requests",
          icon: "requests",
          badge: counts.pending,
        },
        {
          label: "Serah Terima (Issue)",
          href: "/plp/fulfillment/issue",
          icon: "issue",
          badge: counts.issue,
        },
        {
          label: "Pengembalian & Inspeksi",
          href: "/plp/fulfillment/return",
          icon: "return",
          badge: counts.returns,
        },
      ],
    },
    {
      label: "Inventori",
      items: [
        {
          label: "Instrumen",
          href: "/plp/inventory/instruments",
          icon: "instruments",
        },
        {
          label: "Alat (Glassware)",
          href: "/plp/inventory/equipment",
          icon: "equipment",
        },
        {
          label: "Bahan",
          href: "/plp/inventory/materials",
          icon: "materials",
        },
        {
          label: "Stok opname",
          href: "/plp/inventory/opname",
          icon: "batches",
        },
      ],
    },
    {
      label: "Laporan & Riwayat",
      items: [
        { label: "Insiden Lab", href: "/plp/incidents", icon: "incidents" },
        { label: "Riwayat Aktivitas", href: "/plp/history", icon: "history" },
      ],
    },
  ];
}
