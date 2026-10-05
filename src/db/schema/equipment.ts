import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  equipmentClassificationEnum,
  equipmentConditionEnum,
  equipmentStatusEnum,
  equipmentUsageTypeEnum,
} from "./enums";
import { user } from "./user";
import { room } from "./laboratory";
import { media } from "./media";

export const equipmentType = pgTable(
  "equipment_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category"),
    classification: equipmentClassificationEnum("classification")
      .default("INSTRUMENT")
      .notNull(),
    description: text("description"),
    usageType: equipmentUsageTypeEnum("usage_type").notNull(),
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
    index("equipment_type_category_idx").on(table.category),
    index("equipment_type_classification_idx").on(table.classification),
  ],
);

export const equipmentAsset = pgTable(
  "equipment_asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentTypeId: uuid("equipment_type_id")
      .notNull()
      .references(() => equipmentType.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    assetCode: text("asset_code").notNull().unique(),
    serialNumber: text("serial_number"),
    status: equipmentStatusEnum("status").default("AVAILABLE").notNull(),
    condition: equipmentConditionEnum("condition").default("GOOD").notNull(),
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),
    notes: text("notes"),
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
    index("equipment_asset_type_idx").on(table.equipmentTypeId),
    index("equipment_asset_room_idx").on(table.roomId),
    index("equipment_asset_status_idx").on(table.status),
    index("equipment_asset_room_status_idx").on(table.roomId, table.status),
  ],
);

export const equipmentUnit = pgTable(
  "equipment_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    code: text("code").notNull().unique(),
    label: text("label").notNull(),
    qrCode: text("qr_code").unique(),
    storageLocation: text("storage_location"),
    status: equipmentStatusEnum("status").default("AVAILABLE").notNull(),
    condition: equipmentConditionEnum("condition").default("GOOD").notNull(),
    notes: text("notes"),
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
    index("equipment_unit_asset_idx").on(table.equipmentAssetId),
    index("equipment_unit_status_idx").on(table.status),
    index("equipment_unit_qr_code_idx").on(table.qrCode),
    index("equipment_unit_storage_location_idx").on(table.storageLocation),
  ],
);

export const equipmentConditionHistory = pgTable(
  "equipment_condition_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    equipmentUnitId: uuid("equipment_unit_id").references(
      () => equipmentUnit.id,
    ),
    condition: equipmentConditionEnum("condition").notNull(),
    source: text("source").notNull(),
    recordedById: text("recorded_by_id")
      .notNull()
      .references(() => user.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("equipment_condition_history_asset_created_idx").on(
      table.equipmentAssetId,
      table.createdAt,
    ),
  ],
);
