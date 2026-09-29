import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { reservationStatusEnum } from "./enums";
import { equipmentAsset, equipmentUnit } from "./equipment";
import { user } from "./user";
import { resourceRequest } from "./request";

export const reservation = pgTable(
  "reservation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    equipmentUnitId: uuid("equipment_unit_id")
      .notNull()
      .references(() => equipmentUnit.id),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    primaryUserId: text("primary_user_id")
      .notNull()
      .references(() => user.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: reservationStatusEnum("status").default("RESERVED").notNull(),
    purpose: text("purpose"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reservation_unit_period_idx").on(
      table.equipmentUnitId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_asset_period_idx").on(
      table.equipmentAssetId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_primary_user_idx").on(table.primaryUserId),
    index("reservation_request_idx").on(table.requestId),
    index("reservation_status_idx").on(table.status),
  ],
);
