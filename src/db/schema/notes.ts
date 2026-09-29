import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    content: text("content").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      // Use the database clock so update timestamps never trail the insert
      // timestamp when the app host clock runs slightly behind PostgreSQL.
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index("notes_user_created_id_idx").on(
      table.userId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
