import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

// A small key/value store for operational configuration the admin workspace
// owns: cancellation lead time, low-stock ratio, timezone, and so on. Values
// are JSON so a setting can grow without a migration.
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedById: text("updated_by_id").references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
