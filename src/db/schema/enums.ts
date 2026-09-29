import { pgEnum } from "drizzle-orm/pg-core";

export const equipmentUsageTypeEnum = pgEnum("equipment_usage_type", [
  "BORROWABLE",
  "USAGE_ONLY",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "MAINTENANCE",
  "DAMAGED",
  "UNDER_INSPECTION",
  "RETIRED",
]);

export const equipmentConditionEnum = pgEnum("equipment_condition", [
  "GOOD",
  "MINOR_ISSUE",
  "DAMAGED",
  "UNKNOWN",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "THESIS_RESEARCH",
  "PRACTICUM",
  "COURSE_PROJECT",
  "GENERAL_RESEARCH",
  "OTHER",
]);

export const activityStatusEnum = pgEnum("activity_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "DRAFT",
  "SUBMITTED",
  "PENDING_PLP",
  "REQUEST_REVISION",
  "APPROVED",
  "REJECTED",
  "READY_FOR_PICKUP",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "OVERDUE",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "RESERVED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const sharedUsageRequestStatusEnum = pgEnum(
  "shared_usage_request_status",
  ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "REPORTED",
  "UNDER_ASSESSMENT",
  "IN_MAINTENANCE",
  "RESOLVED",
]);

export const stockTransactionTypeEnum = pgEnum("stock_transaction_type", [
  "RECEIVE",
  "RESERVE",
  "RELEASE",
  "ISSUE",
  "ADJUST",
  "EXPIRE",
  "TRANSFER",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "REQUEST_SUBMITTED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_REVISION",
  "REQUEST_READY",
  "REQUEST_COMPLETED",
  "REQUEST_OVERDUE",
  "REQUEST_REMINDER",
  "REQUEST_CANCELLED",
  "SHARED_USAGE_REQUESTED",
  "SHARED_USAGE_ACCEPTED",
  "SHARED_USAGE_DECLINED",
  "EQUIPMENT_ISSUED",
  "EQUIPMENT_RETURNED",
  "INCIDENT_REPORTED",
  "INCIDENT_UPDATED",
  "GENERAL",
]);

export const stockOpnameStatusEnum = pgEnum("stock_opname_status", [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_REVISION",
  "CANCEL",
  "RESERVE",
  "RELEASE",
  "PREPARE",
  "ISSUE",
  "RETURN",
  "COMPLETE",
  "INSPECT",
  "REPORT_INCIDENT",
  "ASSESS_INCIDENT",
  "RESOLVE_INCIDENT",
  "ADJUST_STOCK",
]);
