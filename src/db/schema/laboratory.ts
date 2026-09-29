import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const laboratory = pgTable("laboratory", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const room = pgTable(
  "room",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    laboratoryId: uuid("laboratory_id")
      .notNull()
      .references(() => laboratory.id),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    floor: text("floor"),
    tone: text("tone").default("cream").notNull(),
    mapPosition: jsonb("map_position"),
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
    unique("room_laboratory_code_unique").on(table.laboratoryId, table.code),
    index("room_laboratory_idx").on(table.laboratoryId),
  ],
);
