import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { activityStatusEnum, activityTypeEnum } from "./enums";
import { user } from "./user";

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id),
    supervisorId: text("supervisor_id").references(() => user.id),
    title: text("title").notNull(),
    type: activityTypeEnum("type").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: activityStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("activity_student_idx").on(table.studentId),
    index("activity_supervisor_idx").on(table.supervisorId),
    index("activity_status_idx").on(table.status),
    index("activity_period_idx").on(table.startDate, table.endDate),
  ],
);
