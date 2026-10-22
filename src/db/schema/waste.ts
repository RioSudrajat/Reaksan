import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  wasteContainerStatusEnum,
  wasteLogStatusEnum,
  wastePhysicalStateEnum,
} from "./enums";
import { room } from "./laboratory";
import { user } from "./user";
import { resourceRequest } from "./request";

export const wasteCategory = pgTable(
  "waste_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    physicalState: wastePhysicalStateEnum("physical_state")
      .default("LIQUID")
      .notNull(),
    description: text("description"),
    hazardBadge: text("hazard_badge"),
    colorHex: text("color_hex").default("#e11d48"),
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
    index("waste_category_code_idx").on(table.code),
    index("waste_category_active_idx").on(table.active),
  ],
);

export const wasteManifest = pgTable(
  "waste_manifest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    manifestNumber: text("manifest_number").notNull(),
    transporterName: text("transporter_name").notNull(),
    driverName: text("driver_name"),
    vehiclePlate: text("vehicle_plate"),
    picStaffId: text("pic_staff_id")
      .notNull()
      .references(() => user.id),
    handedOverAt: timestamp("handed_over_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    notes: text("notes"),
    totalContainers: numeric("total_containers", { precision: 5, scale: 0 })
      .default("0")
      .notNull(),
    totalVolumeL: numeric("total_volume_l", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    totalVolumeKg: numeric("total_volume_kg", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("waste_manifest_code_idx").on(table.code),
    index("waste_manifest_handed_over_idx").on(table.handedOverAt),
    index("waste_manifest_pic_idx").on(table.picStaffId),
  ],
);

export const wasteContainer = pgTable(
  "waste_container",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => wasteCategory.id),
    manifestId: uuid("manifest_id").references(() => wasteManifest.id),
    name: text("name").notNull(),
    maxCapacity: numeric("max_capacity", { precision: 10, scale: 2 }).notNull(),
    currentVolume: numeric("current_volume", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    unit: text("unit").default("L").notNull(),
    status: wasteContainerStatusEnum("status").default("ACTIVE").notNull(),
    active: boolean("active").default(true).notNull(),
    qrCode: text("qr_code").unique(),
    locationNotes: text("location_notes"),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    tpsMovedAt: timestamp("tps_moved_at", { withTimezone: true }),
    disposedAt: timestamp("disposed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("waste_container_room_idx").on(table.roomId),
    index("waste_container_category_idx").on(table.categoryId),
    index("waste_container_manifest_idx").on(table.manifestId),
    index("waste_container_status_idx").on(table.status),
    index("waste_container_active_idx").on(table.active),
    index("waste_container_code_idx").on(table.code),
    index("waste_container_qr_code_idx").on(table.qrCode),
  ],
);

export const wasteDisposalLog = pgTable(
  "waste_disposal_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    containerId: uuid("container_id")
      .notNull()
      .references(() => wasteContainer.id),
    requestId: uuid("request_id").references(() => resourceRequest.id),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id),
    verifiedById: text("verified_by_id").references(() => user.id),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").default("L").notNull(),
    chemicalDescription: text("chemical_description").notNull(),
    notes: text("notes"),
    status: wasteLogStatusEnum("status").default("LOGGED").notNull(),
    disposedAt: timestamp("disposed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("waste_disposal_log_container_idx").on(table.containerId),
    index("waste_disposal_log_request_idx").on(table.requestId),
    index("waste_disposal_log_student_idx").on(table.studentId),
    index("waste_disposal_log_status_idx").on(table.status),
    index("waste_disposal_log_disposed_idx").on(table.disposedAt),
  ],
);
