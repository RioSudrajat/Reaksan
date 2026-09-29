import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { stockOpnameStatusEnum } from "./enums";
import { user } from "./user";
import { room } from "./laboratory";
import { materialBatch } from "./material";

// A stock opname is a counting session only. It never writes a stock
// transaction or changes material_batch.quantity; corrections stay in the
// manual batch adjustment flow.
export const stockOpnameSession = pgTable(
  "stock_opname_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    status: stockOpnameStatusEnum("status").default("IN_PROGRESS").notNull(),
    startedById: text("started_by_id")
      .notNull()
      .references(() => user.id),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedById: text("completed_by_id").references(() => user.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("stock_opname_session_room_idx").on(table.roomId),
    index("stock_opname_session_status_idx").on(table.status),
  ],
);

export const stockOpnameEntry = pgTable(
  "stock_opname_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => stockOpnameSession.id, { onDelete: "cascade" }),
    materialBatchId: uuid("material_batch_id")
      .notNull()
      .references(() => materialBatch.id),
    baselineQuantity: numeric("baseline_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    countedQuantity: numeric("counted_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    countedById: text("counted_by_id")
      .notNull()
      .references(() => user.id),
    countedAt: timestamp("counted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("stock_opname_entry_session_batch_unique").on(
      table.sessionId,
      table.materialBatchId,
    ),
    index("stock_opname_entry_session_idx").on(table.sessionId),
  ],
);
