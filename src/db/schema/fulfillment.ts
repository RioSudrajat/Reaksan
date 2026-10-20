import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { equipmentConditionEnum } from "./enums";
import { instrumentAsset, instrumentUnit } from "./instrument";
import { toolAsset, toolUnit } from "./tool";
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
    instrumentAssetId: uuid("instrument_asset_id").references(
      () => instrumentAsset.id,
    ),
    instrumentUnitId: uuid("instrument_unit_id").references(
      () => instrumentUnit.id,
    ),
    toolAssetId: uuid("tool_asset_id").references(() => toolAsset.id),
    toolUnitId: uuid("tool_unit_id").references(() => toolUnit.id),
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
    index("issue_transaction_instrument_asset_idx").on(
      table.instrumentAssetId,
    ),
    index("issue_transaction_tool_asset_idx").on(table.toolAssetId),
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
    instrumentAssetId: uuid("instrument_asset_id").references(
      () => instrumentAsset.id,
    ),
    instrumentUnitId: uuid("instrument_unit_id").references(
      () => instrumentUnit.id,
    ),
    toolAssetId: uuid("tool_asset_id").references(() => toolAsset.id),
    toolUnitId: uuid("tool_unit_id").references(() => toolUnit.id),
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
  (table) => [
    index("return_transaction_instrument_asset_idx").on(
      table.instrumentAssetId,
    ),
    index("return_transaction_tool_asset_idx").on(table.toolAssetId),
  ],
);
