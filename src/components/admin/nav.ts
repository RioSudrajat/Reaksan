import type { NavGroup } from "@/components/workspace-shell";

export const adminNav: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" }],
  },
  {
    label: "Akses",
    items: [
      { label: "Users", href: "/admin/users", icon: "users" },
      { label: "Peran & akses", href: "/admin/roles", icon: "roles" },
    ],
  },
  {
    label: "Master data",
    items: [
      { label: "Laboratories", href: "/admin/laboratories", icon: "labs" },
      { label: "Rooms", href: "/admin/rooms", icon: "rooms" },
      { label: "Equipment types", href: "/admin/equipment", icon: "equipment" },
      {
        label: "Equipment assets",
        href: "/admin/equipment/assets",
        icon: "assets",
      },
      {
        label: "Equipment units",
        href: "/admin/equipment/units",
        icon: "units",
      },
      { label: "Materials", href: "/admin/materials", icon: "materials" },
      {
        label: "Material batches",
        href: "/admin/materials/batches",
        icon: "batches",
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Schedule", href: "/admin/schedule", icon: "schedule" },
      { label: "Assignments", href: "/admin/assignments", icon: "assignments" },
      {
        label: "Configuration",
        href: "/admin/configuration",
        icon: "configuration",
      },
      { label: "Audit logs", href: "/admin/audit-logs", icon: "audit" },
    ],
  },
];
