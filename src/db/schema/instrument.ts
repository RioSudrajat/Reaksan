import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  equipmentConditionEnum,
  equipmentStatusEnum,
  equipmentUsageTypeEnum,
} from "./enums";
import { user } from "./user";
import { room } from "./laboratory";
import { media } from "./media";

export const instrumentType = pgTable(
  "instrument_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    usageType: equipmentUsageTypeEnum("usage_type")
      .default("USAGE_ONLY")
      .notNull(),
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
  (table) => [index("instrument_type_category_idx").on(table.category)],
);

export const instrumentAsset = pgTable(
  "instrument_asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instrumentTypeId: uuid("instrument_type_id")
      .notNull()
      .references(() => instrumentType.id),
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
    index("instrument_asset_type_idx").on(table.instrumentTypeId),
    index("instrument_asset_room_idx").on(table.roomId),
    index("instrument_asset_status_idx").on(table.status),
    index("instrument_asset_room_status_idx").on(table.roomId, table.status),
  ],
);

export const instrumentUnit = pgTable(
  "instrument_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instrumentAssetId: uuid("instrument_asset_id")
      .notNull()
      .references(() => instrumentAsset.id),
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
    index("instrument_unit_asset_idx").on(table.instrumentAssetId),
    index("instrument_unit_status_idx").on(table.status),
    index("instrument_unit_qr_code_idx").on(table.qrCode),
    index("instrument_unit_storage_location_idx").on(table.storageLocation),
  ],
);

export const instrumentConditionHistory = pgTable(
  "instrument_condition_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instrumentAssetId: uuid("instrument_asset_id")
      .notNull()
      .references(() => instrumentAsset.id),
    instrumentUnitId: uuid("instrument_unit_id").references(
      () => instrumentUnit.id,
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
    index("instrument_condition_history_asset_created_idx").on(
      table.instrumentAssetId,
      table.createdAt,
    ),
  ],
);
