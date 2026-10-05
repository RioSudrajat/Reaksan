import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Assignment keeps operational PLP/PIC scope flexible without hardcoding roles per room.
// Example: scopeType = ROOM, scopeId = lab-organik, assignmentType = PLP.
export const assignment = pgTable(
  "assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    scopeType: text("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    assignmentType: text("assignment_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("assignment_user_idx").on(table.userId),
    index("assignment_scope_idx").on(table.scopeType, table.scopeId),
  ],
);
