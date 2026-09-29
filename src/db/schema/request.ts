import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { requestStatusEnum } from "./enums";
import { activity } from "./activity";
import { equipmentAsset, equipmentUnit } from "./equipment";
import { material, materialBatch } from "./material";
import { room } from "./laboratory";
import { user } from "./user";

export const resourceRequest = pgTable(
  "resource_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    supervisorName: text("supervisor_name").default("").notNull(),
    fieldPicName: text("field_pic_name").default("").notNull(),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    description: text("description"),
    mode: text("mode").default("BORROW").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    practicalPlan: jsonb("practical_plan").default({}).notNull(),
    status: requestStatusEnum("status").default("DRAFT").notNull(),
    revisionNote: text("revision_note"),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resource_request_student_idx").on(table.studentId),
    index("resource_request_activity_idx").on(table.activityId),
    index("resource_request_room_idx").on(table.roomId),
    index("resource_request_status_idx").on(table.status),
    index("resource_request_period_idx").on(table.startAt, table.endAt),
  ],
);

export const equipmentRequestItem = pgTable(
  "equipment_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    equipmentUnitId: uuid("equipment_unit_id")
      .notNull()
      .references(() => equipmentUnit.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    usagePlan: jsonb("usage_plan"),
  },
  (table) => [
    index("equipment_request_item_request_idx").on(table.requestId),
    index("equipment_request_item_unit_period_idx").on(
      table.equipmentUnitId,
      table.startAt,
      table.endAt,
    ),
  ],
);

export const materialRequestItem = pgTable(
  "material_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id),
    allocatedBatchId: uuid("allocated_batch_id").references(
      () => materialBatch.id,
    ),
    requestedQuantity: numeric("requested_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    unit: text("unit").notNull(),
  },
  (table) => [
    index("material_request_item_request_idx").on(table.requestId),
    index("material_request_item_material_idx").on(table.materialId),
  ],
);
