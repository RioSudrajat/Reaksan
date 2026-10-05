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
          label: "Schedule",
          href: "/plp/schedule",
          icon: "schedule",
        },
      ],
    },
    {
      label: "Fulfillment",
      items: [
        {
          label: "Request review",
          href: "/plp/requests",
          icon: "requests",
          badge: counts.pending,
        },
        {
          label: "Issue",
          href: "/plp/fulfillment/issue",
          icon: "issue",
          badge: counts.issue,
        },
        {
          label: "Return & inspeksi",
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
      label: "Support",
      items: [
        { label: "Incidents", href: "/plp/incidents", icon: "incidents" },
        { label: "History", href: "/plp/history", icon: "history" },
      ],
    },
  ];
}
