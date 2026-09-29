import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { stockTransactionTypeEnum } from "./enums";
import { user } from "./user";
import { room } from "./laboratory";
import { media } from "./media";

export const material = pgTable(
  "material",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    baseUnit: text("base_unit").notNull(),
    description: text("description"),
    imageMediaId: uuid("image_media_id").references(() => media.id),
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
    index("material_name_idx").on(table.name),
    index("material_category_idx").on(table.category),
  ],
);

export const materialBatch = pgTable(
  "material_batch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    lotNumber: text("lot_number"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    receivedDate: timestamp("received_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    index("material_batch_material_idx").on(table.materialId),
    index("material_batch_room_idx").on(table.roomId),
    index("material_batch_expiry_idx").on(table.expiryDate),
    index("material_batch_material_expiry_idx").on(
      table.materialId,
      table.expiryDate,
    ),
  ],
);

export const materialDispensingRule = pgTable("material_dispensing_rule", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id")
    .notNull()
    .unique()
    .references(() => material.id),
  minimumQuantity: numeric("minimum_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  dispensingIncrement: numeric("dispensing_increment", {
    precision: 14,
    scale: 3,
  }).notNull(),
  maximumQuantity: numeric("maximum_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  unit: text("unit").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const stockTransaction = pgTable(
  "stock_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialBatchId: uuid("material_batch_id")
      .notNull()
      .references(() => materialBatch.id),
    type: stockTransactionTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    beforeQuantity: numeric("before_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    afterQuantity: numeric("after_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    performedById: text("performed_by_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_transaction_batch_created_idx").on(
      table.materialBatchId,
      table.createdAt,
    ),
    index("stock_transaction_reference_idx").on(
      table.referenceType,
      table.referenceId,
    ),
  ],
);
