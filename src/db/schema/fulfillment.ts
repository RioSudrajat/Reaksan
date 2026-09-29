import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { equipmentConditionEnum } from "./enums";
import { equipmentAsset, equipmentUnit } from "./equipment";
import { user } from "./user";
import { materialBatch } from "./material";
import { resourceRequest } from "./request";

export const issueTransaction = pgTable(
  "issue_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id),
    equipmentAssetId: uuid("equipment_asset_id").references(
      () => equipmentAsset.id,
    ),
    equipmentUnitId: uuid("equipment_unit_id").references(
      () => equipmentUnit.id,
    ),
    materialBatchId: uuid("material_batch_id").references(
      () => materialBatch.id,
    ),
    issuedToId: text("issued_to_id")
      .notNull()
      .references(() => user.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }),
    issuedById: text("issued_by_id")
      .notNull()
      .references(() => user.id),
    conditionAtIssue: equipmentConditionEnum("condition_at_issue"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("issue_transaction_request_idx").on(table.requestId),
    index("issue_transaction_asset_idx").on(table.equipmentAssetId),
    index("issue_transaction_batch_idx").on(table.materialBatchId),
    index("issue_transaction_recipient_idx").on(table.issuedToId),
  ],
);

export const returnTransaction = pgTable(
  "return_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    issueTransactionId: uuid("issue_transaction_id")
      .notNull()
      .unique()
      .references(() => issueTransaction.id),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    returnedById: text("returned_by_id")
      .notNull()
      .references(() => user.id),
    receivedById: text("received_by_id")
      .notNull()
      .references(() => user.id),
    conditionAtReturn: equipmentConditionEnum("condition_at_return").notNull(),
    notes: text("notes"),
    returnedAt: timestamp("returned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("return_transaction_asset_idx").on(table.equipmentAssetId)],
);
