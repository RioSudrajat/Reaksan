import {
  boolean,
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
import { instrumentAsset, instrumentUnit } from "./instrument";
import { toolAsset, toolUnit } from "./tool";
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
    returnSubmission: jsonb("return_submission"),
    returnSubmittedAt: timestamp("return_submitted_at", { withTimezone: true }),
    returnConfirmedAt: timestamp("return_confirmed_at", { withTimezone: true }),
    returnConfirmedById: text("return_confirmed_by_id").references(
      () => user.id,
    ),
    returnRejectionReason: text("return_rejection_reason"),
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

export const instrumentRequestItem = pgTable(
  "instrument_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    instrumentAssetId: uuid("instrument_asset_id")
      .notNull()
      .references(() => instrumentAsset.id),
    instrumentUnitId: uuid("instrument_unit_id")
      .notNull()
      .references(() => instrumentUnit.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    allowSharedUsage: boolean("allow_shared_usage").default(false).notNull(),
    purpose: text("purpose"),
    usagePlan: jsonb("usage_plan"),
  },
  (table) => [
    index("instrument_request_item_request_idx").on(table.requestId),
    index("instrument_request_item_unit_period_idx").on(
      table.instrumentUnitId,
      table.startAt,
      table.endAt,
    ),
  ],
);

export const toolRequestItem = pgTable(
  "tool_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    toolAssetId: uuid("tool_asset_id")
      .notNull()
      .references(() => toolAsset.id),
    toolUnitId: uuid("tool_unit_id")
      .notNull()
      .references(() => toolUnit.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    usagePlan: jsonb("usage_plan"),
  },
  (table) => [
    index("tool_request_item_request_idx").on(table.requestId),
    index("tool_request_item_unit_period_idx").on(
      table.toolUnitId,
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
