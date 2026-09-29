import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { incidentSeverityEnum, incidentStatusEnum } from "./enums";
import { activity } from "./activity";
import { equipmentAsset } from "./equipment";
import { room } from "./laboratory";
import { user } from "./user";
import { resourceRequest } from "./request";
import { reservation } from "./reservation";

export const incident = pgTable(
  "incident",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    equipmentAssetId: uuid("equipment_asset_id").references(
      () => equipmentAsset.id,
    ),
    roomId: uuid("room_id").references(() => room.id),
    requestId: uuid("request_id").references(() => resourceRequest.id),
    reservationId: uuid("reservation_id").references(() => reservation.id),
    activityId: uuid("activity_id").references(() => activity.id),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: incidentSeverityEnum("severity").default("MEDIUM").notNull(),
    status: incidentStatusEnum("status").default("REPORTED").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("incident_asset_idx").on(table.equipmentAssetId),
    index("incident_room_idx").on(table.roomId),
    index("incident_request_idx").on(table.requestId),
    index("incident_reservation_idx").on(table.reservationId),
    index("incident_reporter_idx").on(table.reporterId),
    index("incident_status_idx").on(table.status),
  ],
);

export const incidentAssessment = pgTable("incident_assessment", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .notNull()
    .unique()
    .references(() => incident.id),
  assessedById: text("assessed_by_id")
    .notNull()
    .references(() => user.id),
  finding: text("finding").notNull(),
  assessment: text("assessment").notNull(),
  recommendedAction: text("recommended_action"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const incidentResolution = pgTable("incident_resolution", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .notNull()
    .unique()
    .references(() => incident.id),
  resolvedById: text("resolved_by_id")
    .notNull()
    .references(() => user.id),
  action: text("action").notNull(),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
