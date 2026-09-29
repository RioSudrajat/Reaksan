import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Role permissions are editable at runtime. A row is the source of truth once
// it exists; a missing row falls back to the compile-time defaults in
// src/lib/permissions.ts (also used by Better Auth's own admin endpoints). The
// admin role row is never editable so nobody can lock themselves out.
export type RolePermissionMap = Record<string, string[]>;

export const appRole = pgTable("app_role", {
  name: text("name").primaryKey(),
  permissions: jsonb("permissions").$type<RolePermissionMap>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
