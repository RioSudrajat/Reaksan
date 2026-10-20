import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { reservationStatusEnum } from "./enums";
import { instrumentAsset, instrumentUnit } from "./instrument";
import { toolAsset, toolUnit } from "./tool";
import { user } from "./user";
import { resourceRequest } from "./request";

export const reservation = pgTable(
  "reservation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instrumentAssetId: uuid("instrument_asset_id").references(
      () => instrumentAsset.id,
    ),
    instrumentUnitId: uuid("instrument_unit_id").references(
      () => instrumentUnit.id,
    ),
    toolAssetId: uuid("tool_asset_id").references(() => toolAsset.id),
    toolUnitId: uuid("tool_unit_id").references(() => toolUnit.id),
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
    index("reservation_instrument_unit_period_idx").on(
      table.instrumentUnitId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_tool_unit_period_idx").on(
      table.toolUnitId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_instrument_asset_period_idx").on(
      table.instrumentAssetId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_tool_asset_period_idx").on(
      table.toolAssetId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_primary_user_idx").on(table.primaryUserId),
    index("reservation_request_idx").on(table.requestId),
    index("reservation_status_idx").on(table.status),
  ],
);
