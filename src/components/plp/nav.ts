import type { NavGroup } from "@/components/workspace-shell";

export function plpNav(counts: {
  pending: number;
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
          label: "Request review",
          href: "/plp/requests",
          icon: "requests",
          badge: counts.pending,
        },
      ],
    },
    {
      label: "Fulfillment",
      items: [
        { label: "Issue", href: "/plp/fulfillment/issue", icon: "issue" },
        {
          label: "Return & inspeksi",
          href: "/plp/fulfillment/return",
          icon: "return",
          badge: counts.returns,
        },
        { label: "Schedule", href: "/plp/schedule", icon: "schedule" },
      ],
    },
    {
      label: "Inventori",
      items: [
        {
          label: "Equipment",
          href: "/plp/inventory/equipment",
          icon: "equipment",
        },
        {
          label: "Materials",
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
