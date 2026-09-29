import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sharedUsageRequestStatusEnum } from "./enums";
import { user } from "./user";
import { reservation } from "./reservation";

export const sharedUsageRequest = pgTable(
  "shared_usage_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id),
    requestedStartAt: timestamp("requested_start_at", {
      withTimezone: true,
    }).notNull(),
    requestedEndAt: timestamp("requested_end_at", {
      withTimezone: true,
    }).notNull(),
    purpose: text("purpose"),
    status: sharedUsageRequestStatusEnum("status")
      .default("PENDING")
      .notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("shared_usage_request_reservation_idx").on(table.reservationId),
    index("shared_usage_request_requester_idx").on(table.requesterId),
    index("shared_usage_request_status_idx").on(table.status),
  ],
);

export const sharedUsage = pgTable(
  "shared_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id),
    sharedUsageRequestId: uuid("shared_usage_request_id").references(
      () => sharedUsageRequest.id,
    ),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shared_usage_reservation_period_idx").on(
      table.reservationId,
      table.startAt,
      table.endAt,
    ),
    index("shared_usage_user_idx").on(table.userId),
  ],
);
