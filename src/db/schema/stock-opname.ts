import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  equipmentConditionEnum,
  opnameEntrySourceEnum,
  opnameVarianceReasonEnum,
  stockOpnameItemTypeEnum,
  stockOpnameStatusEnum,
} from "./enums";
import { user } from "./user";
import { room } from "./laboratory";
import { materialBatch } from "./material";
import { equipmentAsset, equipmentUnit } from "./equipment";

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
    itemType: stockOpnameItemTypeEnum("item_type")
      .default("MATERIAL")
      .notNull(),
    materialBatchId: uuid("material_batch_id").references(
      () => materialBatch.id,
    ),
    equipmentAssetId: uuid("equipment_asset_id").references(
      () => equipmentAsset.id,
    ),
    equipmentUnitId: uuid("equipment_unit_id").references(
      () => equipmentUnit.id,
    ),
    baselineQuantity: numeric("baseline_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    countedQuantity: numeric("counted_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    condition: equipmentConditionEnum("condition"),
    countedById: text("counted_by_id")
      .notNull()
      .references(() => user.id),
    countedAt: timestamp("counted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    entrySource: opnameEntrySourceEnum("entry_source")
      .default("SYSTEM_PLANNED")
      .notNull(),
    varianceReason: opnameVarianceReasonEnum("variance_reason"),
    storageLocation: text("storage_location"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("stock_opname_entry_session_batch_unique").on(
      table.sessionId,
      table.materialBatchId,
    ),
    uniqueIndex("stock_opname_entry_session_asset_unique").on(
      table.sessionId,
      table.equipmentAssetId,
    ),
    uniqueIndex("stock_opname_entry_session_unit_unique").on(
      table.sessionId,
      table.equipmentUnitId,
    ),
    index("stock_opname_entry_session_idx").on(table.sessionId),
    index("stock_opname_entry_source_idx").on(table.entrySource),
    index("stock_opname_entry_item_type_idx").on(table.itemType),
  ],
);
