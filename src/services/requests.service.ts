import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  activity,
  auditLog,
  instrumentAsset,
  instrumentConditionHistory,
  instrumentRequestItem,
  instrumentType,
  instrumentUnit,
  issueTransaction,
  material,
  materialBatch,
  materialDispensingRule,
  materialRequestItem,
  reservation,
  resourceRequest,
  returnTransaction,
  room,
  stockTransaction,
  toolAsset,
  toolConditionHistory,
  toolRequestItem,
  toolType,
  toolUnit,
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { nextYearlyCode } from "@/services/code-sequence";
import { writeAudit } from "@/services/audit.service";
import {
  createNotification,
  createNotifications,
  listStaffRecipients,
} from "@/services/notifications.service";
import {
  allocateStock,
  listBatchStock,
  recordStockTransaction,
  stockTotalsForMaterial,
} from "@/services/stock.service";
import type { CreateRequestInput } from "@/validators/requests";

export type EquipmentItemDto = {
  id: string;
  unitCode: string;
  unitLabel: string;
  assetCode: string;
  assetName: string;
  classification: "INSTRUMENT" | "TOOL";
  usageType: "BORROWABLE" | "USAGE_ONLY";
  purpose?: string;
  imageMediaId: string | null;
};

export type MaterialItemDto = {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  imageMediaId: string | null;
};

export type RequestDto = {
  id: string;
  code: string;
  title: string;
  purpose: string;
  mode: "borrow";
  status: (typeof resourceRequest.$inferSelect)["status"];
  activityId: string;
  activityTitle: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  startAt: string;
  endAt: string;
  supervisor: string;
  fieldPic: string;
  revisionNote: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  overdue: boolean;
  actorId: string;
  actorName: string;
  equipment: EquipmentItemDto[];
  materials: MaterialItemDto[];
  issuedAt: string | null;
  returnedAt: string | null;
};

export type ReservationDto = {
  id: string;
  kind: "reservation" | "shared";
  unitCode: string;
  unitLabel: string;
  assetCode: string;
  assetName: string;
  classification?: "INSTRUMENT" | "TOOL";
  roomCode: string;
  roomName: string;
  requestId: string;
  requestCode: string;
  requestTitle: string;
  requestStatus?: (typeof resourceRequest.$inferSelect)["status"];
  primaryUserId: string;
  primaryUserName: string;
  startAt: string;
  endAt: string;
  status: "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  purpose: string;
  mine: boolean;
  imageMediaId: string | null;
  supervisor?: string | null;
  fieldPic?: string | null;
  issuedAt?: string | null;
  returnedAt?: string | null;
  materials?: MaterialItemDto[];
};

const conflictStatuses = ["RESERVED", "ACTIVE"] as const;

function requestCode(exec: DbExecutor) {
  return nextYearlyCode(exec, "resource_request", "REQ");
}

async function ensureDefaultActivity(
  exec: DbExecutor,
  studentId: string,
  requestTitle: string,
) {
  const [existing] = await exec
    .select({ id: activity.id })
    .from(activity)
    .where(
      and(eq(activity.studentId, studentId), eq(activity.status, "ACTIVE")),
    )
    .orderBy(desc(activity.createdAt))
    .limit(1);
  if (existing) return existing;
  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);
  const [created] = await exec
    .insert(activity)
    .values({
      studentId,
      title: "Aktivitas penelitian",
      type: "GENERAL_RESEARCH",
      description: `Aktivitas otomatis untuk request "${requestTitle}".`,
      startDate: now,
      endDate: end,
    })
    .returning({ id: activity.id });
  return created;
}

async function resolveEquipment(
  exec: DbExecutor,
  roomId: string,
  roomLabel: string,
  codes: string[],
) {
  if (codes.length === 0) return [];
  const instrumentRows = await exec
    .select({
      unitId: instrumentUnit.id,
      unitCode: instrumentUnit.code,
      unitLabel: instrumentUnit.label,
      unitStatus: instrumentUnit.status,
      unitActive: instrumentUnit.active,
      assetId: instrumentAsset.id,
      assetCode: instrumentAsset.assetCode,
      assetName: instrumentType.name,
      roomId: instrumentAsset.roomId,
      roomName: room.name,
      classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
      usageType: instrumentType.usageType,
    })
    .from(instrumentUnit)
    .innerJoin(
      instrumentAsset,
      eq(instrumentAsset.id, instrumentUnit.instrumentAssetId),
    )
    .innerJoin(
      instrumentType,
      eq(instrumentType.id, instrumentAsset.instrumentTypeId),
    )
    .innerJoin(room, eq(room.id, instrumentAsset.roomId))
    .where(inArray(instrumentUnit.code, codes));

  const remainingCodes = codes.filter(
    (code) => !instrumentRows.some((row) => row.unitCode === code),
  );

  const toolRows =
    remainingCodes.length > 0
      ? await exec
          .select({
            unitId: toolUnit.id,
            unitCode: toolUnit.code,
            unitLabel: toolUnit.label,
            unitStatus: toolUnit.status,
            unitActive: toolUnit.active,
            assetId: toolAsset.id,
            assetCode: toolAsset.assetCode,
            assetName: toolType.name,
            roomId: toolAsset.roomId,
            roomName: room.name,
            classification: sql<"TOOL">`'TOOL'`,
            usageType: toolType.usageType,
          })
          .from(toolUnit)
          .innerJoin(toolAsset, eq(toolAsset.id, toolUnit.toolAssetId))
          .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
          .innerJoin(room, eq(room.id, toolAsset.roomId))
          .where(inArray(toolUnit.code, remainingCodes))
      : [];

  const rows = [...instrumentRows, ...toolRows];
  if (rows.length !== codes.length)
    throw new ApiError(
      422,
      "UNKNOWN_EQUIPMENT",
      "One or more equipment units are not tracked in the catalog.",
    );
  for (const row of rows) {
    if (row.roomId !== roomId)
      throw new ApiError(
        422,
        "ROOM_MISMATCH",
        `${row.unitCode} is tracked in ${row.roomName}, not ${roomLabel}.`,
      );
    if (
      !row.unitActive ||
      ["MAINTENANCE", "DAMAGED", "RETIRED"].includes(row.unitStatus)
    )
      throw new ApiError(
        409,
        "UNIT_UNAVAILABLE",
        `${row.unitCode} cannot be requested in its current state.`,
      );
  }
  return rows;
}

// Row locks on the physical units serialise every writer that checks and then
// claims the same unit (submission, edit, approval), closing the window between
// the conflict SELECT and the INSERT. Ids are sorted so concurrent transactions
// always acquire locks in the same order and cannot deadlock each other.
async function lockEquipmentUnits(
  exec: DbExecutor,
  rows: { unitId: string; classification: string }[],
) {
  const instrumentIds = rows
    .filter((row) => row.classification === "INSTRUMENT")
    .map((row) => row.unitId)
    .sort();
  const toolIds = rows
    .filter((row) => row.classification !== "INSTRUMENT")
    .map((row) => row.unitId)
    .sort();
  if (instrumentIds.length > 0)
    await exec
      .select({ id: instrumentUnit.id })
      .from(instrumentUnit)
      .where(inArray(instrumentUnit.id, instrumentIds))
      .orderBy(instrumentUnit.id)
      .for("update");
  if (toolIds.length > 0)
    await exec
      .select({ id: toolUnit.id })
      .from(toolUnit)
      .where(inArray(toolUnit.id, toolIds))
      .orderBy(toolUnit.id)
      .for("update");
}

async function assertNoReservationConflict(
  exec: DbExecutor,
  unitIds: string[],
  startAt: Date,
  endAt: Date,
  excludeRequestId?: string,
) {
  if (unitIds.length === 0) return;
  const filters = [
    or(
      inArray(reservation.instrumentUnitId, unitIds),
      inArray(reservation.toolUnitId, unitIds),
    ),
    inArray(reservation.status, [...conflictStatuses]),
    sql`${reservation.startAt} < ${endAt}`,
    sql`${reservation.endAt} > ${startAt}`,
  ];
  if (excludeRequestId)
    filters.push(ne(reservation.requestId, excludeRequestId));
  const conflicts = await exec
    .select({
      instrumentUnitCode: instrumentUnit.code,
      toolUnitCode: toolUnit.code,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    })
    .from(reservation)
    .leftJoin(
      instrumentUnit,
      eq(instrumentUnit.id, reservation.instrumentUnitId),
    )
    .leftJoin(toolUnit, eq(toolUnit.id, reservation.toolUnitId))
    .where(and(...filters))
    .limit(1);
  if (conflicts.length > 0) {
    const conflict = conflicts[0];
    const unitCode =
      conflict.instrumentUnitCode ?? conflict.toolUnitCode ?? "Unit";
    throw new ApiError(
      409,
      "RESERVATION_CONFLICT",
      `${unitCode} sudah dipesan pada waktu yang dipilih. Pilih slot lain.`,
    );
  }
}

async function resolveMaterials(
  exec: DbExecutor,
  roomId: string,
  roomLabel: string,
  items: CreateRequestInput["materials"],
) {
  if (items.length === 0) return [];
  const codes = items.map((item) => item.materialCode);
  const rows = await exec
    .select({
      materialId: material.id,
      code: material.code,
      name: material.name,
      active: material.active,
      baseUnit: material.baseUnit,
      minimum: materialDispensingRule.minimumQuantity,
      increment: materialDispensingRule.dispensingIncrement,
      maximum: materialDispensingRule.maximumQuantity,
      ruleUnit: materialDispensingRule.unit,
    })
    .from(material)
    .leftJoin(
      materialDispensingRule,
      eq(materialDispensingRule.materialId, material.id),
    )
    .where(inArray(material.code, codes));
  if (rows.length !== codes.length)
    throw new ApiError(
      422,
      "UNKNOWN_MATERIAL",
      "One or more materials are not tracked in the catalog.",
    );
  const batchRows = await listBatchStock(
    exec,
    rows.map((row) => row.materialId),
  );
  // Stock is owned per lab: only batches stored in the requested lab count.
  const roomBatchRows = batchRows.filter((batch) => batch.roomId === roomId);
  return items.map((item) => {
    const row = rows.find((entry) => entry.code === item.materialCode);
    if (!row || !row.active)
      throw new ApiError(422, "INACTIVE_MATERIAL", "Material is not active.");
    const inRoom = roomBatchRows.some(
      (batch) => batch.materialId === row.materialId,
    );
    if (!inRoom)
      throw new ApiError(
        422,
        "ROOM_MISMATCH",
        `${row.name} is not stored in ${roomLabel}.`,
      );
    const totals = stockTotalsForMaterial(roomBatchRows, row.materialId);
    const unit = row.ruleUnit ?? row.baseUnit;
    if (!row.minimum || !row.increment || !row.maximum)
      throw new ApiError(
        409,
        "NO_DISPENSING_RULE",
        `${row.name} has no dispensing rule yet.`,
      );
    const minimum = Number(row.minimum);
    const maximum = Number(row.maximum);
    if (item.quantity < minimum)
      throw new ApiError(
        422,
        "BELOW_MINIMUM",
        `${row.name} minimum is ${minimum} ${unit}.`,
      );
    if (item.quantity > maximum)
      throw new ApiError(
        422,
        "ABOVE_MAXIMUM",
        `${row.name} maximum is ${maximum} ${unit}.`,
      );
    if (item.quantity > totals.available + 1e-6)
      throw new ApiError(
        409,
        "INSUFFICIENT_STOCK",
        `${row.name} hanya tersedia ${totals.available} ${unit}.`,
      );
    return {
      materialId: row.materialId,
      code: row.code,
      name: row.name,
      unit,
      quantity: item.quantity,
    };
  });
}

export type RequestLoadFilters = {
  requestId?: string;
  studentId?: string;
  statuses?: (typeof resourceRequest.$inferSelect)["status"][];
  roomCode?: string;
  // null = no scope filter; an empty array means no lab is allowed.
  roomCodes?: string[] | null;
  search?: string;
  from?: Date;
  to?: Date;
  orderBy?: "statusPriority" | "startAt" | "createdAt";
  limit?: number;
  offset?: number;
};

function requestConditions(options: RequestLoadFilters) {
  const conditions = [];
  if (options.requestId)
    conditions.push(eq(resourceRequest.id, options.requestId));
  if (options.studentId)
    conditions.push(eq(resourceRequest.studentId, options.studentId));
  if (options.statuses?.length) {
    const effectiveStatuses =
      options.statuses.includes("PENDING_PLP") &&
      !options.statuses.includes("SUBMITTED")
        ? [...options.statuses, "SUBMITTED" as const]
        : options.statuses;
    conditions.push(inArray(resourceRequest.status, effectiveStatuses));
  }
  if (options.roomCode) conditions.push(eq(room.code, options.roomCode));
  if (options.roomCodes !== undefined)
    conditions.push(
      options.roomCodes === null
        ? sql`true`
        : options.roomCodes.length === 0
          ? sql`false`
          : inArray(room.code, options.roomCodes),
    );
  if (options.from) conditions.push(gte(resourceRequest.endAt, options.from));
  if (options.to) conditions.push(lte(resourceRequest.startAt, options.to));
  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        ilike(user.name, pattern),
        ilike(activity.title, pattern),
        ilike(resourceRequest.code, pattern),
        ilike(resourceRequest.title, pattern),
      ),
    );
  }
  return conditions;
}

export async function loadRequestDtos(
  exec: DbExecutor,
  options: RequestLoadFilters,
): Promise<RequestDto[]> {
  const conditions = requestConditions(options);
  const requestRows = await exec
    .select({
      id: resourceRequest.id,
      code: resourceRequest.code,
      title: resourceRequest.title,
      purpose: resourceRequest.purpose,
      status: resourceRequest.status,
      startAt: resourceRequest.startAt,
      endAt: resourceRequest.endAt,
      supervisorName: resourceRequest.supervisorName,
      fieldPicName: resourceRequest.fieldPicName,
      revisionNote: resourceRequest.revisionNote,
      rejectionReason: resourceRequest.rejectionReason,
      submittedAt: resourceRequest.submittedAt,
      approvedAt: resourceRequest.approvedAt,
      createdAt: resourceRequest.createdAt,
      studentId: resourceRequest.studentId,
      activityId: activity.id,
      activityTitle: activity.title,
      roomCode: room.code,
      roomName: room.name,
      actorName: user.name,
    })
    .from(resourceRequest)
    .innerJoin(room, eq(room.id, resourceRequest.roomId))
    .innerJoin(user, eq(user.id, resourceRequest.studentId))
    .innerJoin(activity, eq(activity.id, resourceRequest.activityId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      ...(options.orderBy === "statusPriority"
        ? [
            sql`CASE ${resourceRequest.status}
              WHEN 'PENDING_PLP' THEN 1
              WHEN 'SUBMITTED' THEN 1
              WHEN 'REQUEST_REVISION' THEN 2
              WHEN 'APPROVED' THEN 3
              WHEN 'READY_FOR_PICKUP' THEN 4
              WHEN 'ACTIVE' THEN 5
              WHEN 'OVERDUE' THEN 6
              WHEN 'RETURNED' THEN 7
              WHEN 'COMPLETED' THEN 8
              WHEN 'REJECTED' THEN 9
              WHEN 'CANCELLED' THEN 10
              WHEN 'EXPIRED' THEN 11
              WHEN 'DRAFT' THEN 12
              ELSE 99
            END ASC`,
            desc(resourceRequest.startAt),
          ]
        : options.orderBy === "createdAt"
          ? [desc(resourceRequest.createdAt)]
          : [desc(resourceRequest.startAt)]),
    )
    .limit(options.limit ?? 200)
    .offset(options.offset ?? 0);
  if (requestRows.length === 0) return [];
  const requestIds = requestRows.map((row) => row.id);

  const [instrumentRows, toolRows] = await Promise.all([
    exec
      .select({
        id: instrumentRequestItem.id,
        requestId: instrumentRequestItem.requestId,
        purpose: instrumentRequestItem.purpose,
        unitCode: instrumentUnit.code,
        unitLabel: instrumentUnit.label,
        assetCode: instrumentAsset.assetCode,
        assetName: instrumentType.name,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
        usageType: instrumentType.usageType,
        assetImageMediaId: instrumentAsset.imageMediaId,
        typeImageMediaId: instrumentType.imageMediaId,
      })
      .from(instrumentRequestItem)
      .innerJoin(
        instrumentUnit,
        eq(instrumentUnit.id, instrumentRequestItem.instrumentUnitId),
      )
      .innerJoin(
        instrumentAsset,
        eq(instrumentAsset.id, instrumentRequestItem.instrumentAssetId),
      )
      .innerJoin(
        instrumentType,
        eq(instrumentType.id, instrumentAsset.instrumentTypeId),
      )
      .where(inArray(instrumentRequestItem.requestId, requestIds)),
    exec
      .select({
        id: toolRequestItem.id,
        requestId: toolRequestItem.requestId,
        purpose: toolRequestItem.purpose,
        unitCode: toolUnit.code,
        unitLabel: toolUnit.label,
        assetCode: toolAsset.assetCode,
        assetName: toolType.name,
        classification: sql<"TOOL">`'TOOL'`,
        usageType: toolType.usageType,
        assetImageMediaId: toolAsset.imageMediaId,
        typeImageMediaId: toolType.imageMediaId,
      })
      .from(toolRequestItem)
      .innerJoin(toolUnit, eq(toolUnit.id, toolRequestItem.toolUnitId))
      .innerJoin(toolAsset, eq(toolAsset.id, toolRequestItem.toolAssetId))
      .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
      .where(inArray(toolRequestItem.requestId, requestIds)),
  ]);
  const equipmentRows = [...instrumentRows, ...toolRows];

  const materialRows = await exec
    .select({
      id: materialRequestItem.id,
      requestId: materialRequestItem.requestId,
      quantity: materialRequestItem.requestedQuantity,
      unit: materialRequestItem.unit,
      code: material.code,
      name: material.name,
      imageMediaId: material.imageMediaId,
    })
    .from(materialRequestItem)
    .innerJoin(material, eq(material.id, materialRequestItem.materialId))
    .where(inArray(materialRequestItem.requestId, requestIds));

  const issueRows = await exec
    .select({
      requestId: issueTransaction.requestId,
      issuedAt: issueTransaction.issuedAt,
    })
    .from(issueTransaction)
    .where(inArray(issueTransaction.requestId, requestIds))
    .orderBy(asc(issueTransaction.issuedAt));
  const returnRows = await exec
    .select({
      requestId: issueTransaction.requestId,
      returnedAt: returnTransaction.returnedAt,
    })
    .from(returnTransaction)
    .innerJoin(
      issueTransaction,
      eq(issueTransaction.id, returnTransaction.issueTransactionId),
    )
    .where(inArray(issueTransaction.requestId, requestIds))
    .orderBy(asc(returnTransaction.returnedAt));

  return requestRows.map<RequestDto>((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    purpose: row.purpose,
    mode: "borrow",
    status: row.status,
    activityId: row.activityId,
    activityTitle: row.activityTitle,
    roomId: row.roomCode,
    roomCode: row.roomCode,
    roomName: row.roomName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    supervisor: row.supervisorName,
    fieldPic: row.fieldPicName,
    revisionNote: row.revisionNote,
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    overdue: row.endAt.getTime() < Date.now(),
    actorId: row.studentId,
    actorName: row.actorName,
    equipment: equipmentRows
      .filter((item) => item.requestId === row.id)
      .map((item) => ({
        id: item.id,
        unitCode: item.unitCode,
        unitLabel: item.unitLabel,
        assetCode: item.assetCode,
        assetName: item.assetName,
        classification: item.classification,
        usageType: item.usageType,
        purpose: item.purpose ?? undefined,
        imageMediaId: item.assetImageMediaId ?? item.typeImageMediaId ?? null,
      })),
    materials: materialRows
      .filter((item) => item.requestId === row.id)
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        imageMediaId: item.imageMediaId ?? null,
      })),
    issuedAt:
      issueRows
        .find((item) => item.requestId === row.id)
        ?.issuedAt.toISOString() ?? null,
    returnedAt:
      returnRows
        .filter((item) => item.requestId === row.id)
        .at(-1)
        ?.returnedAt.toISOString() ?? null,
  }));
}

export async function loadRequestDto(exec: DbExecutor, requestId: string) {
  const rows = await loadRequestDtos(exec, { requestId });
  const dto = rows[0];
  if (!dto) throw new ApiError(404, "NOT_FOUND", "Request not found.");
  return dto;
}

export async function listMyRequests(userId: string) {
  return loadRequestDtos(db, { studentId: userId });
}

export async function getMyRequest(userId: string, requestId: string) {
  const rows = await loadRequestDtos(db, { requestId, studentId: userId });
  return rows[0] ?? null;
}

export async function countRequestRows(
  exec: DbExecutor,
  filters: RequestLoadFilters,
) {
  const conditions = requestConditions(filters);
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(resourceRequest)
    .innerJoin(room, eq(room.id, resourceRequest.roomId))
    .innerJoin(user, eq(user.id, resourceRequest.studentId))
    .innerJoin(activity, eq(activity.id, resourceRequest.activityId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row?.count ?? 0;
}

// PLP list with offset pagination. Filters are applied in SQL so the count and
// the page always describe the same rows.
export async function listRequestPage(filters: RequestLoadFilters) {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const [data, total] = await Promise.all([
    loadRequestDtos(db, { ...filters, limit, offset }),
    countRequestRows(db, filters),
  ]);
  return {
    data,
    meta: {
      limit,
      offset,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getAnyRequest(requestId: string) {
  const rows = await loadRequestDtos(db, { requestId });
  return rows[0] ?? null;
}

export type RequestTimelineEntry = {
  id: string;
  action: string;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
};

export async function loadRequestTimeline(
  exec: DbExecutor,
  requestId: string,
): Promise<RequestTimelineEntry[]> {
  const rows = await exec
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorName: user.name,
      reason: auditLog.reason,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(
      and(
        eq(auditLog.entityType, "resource_request"),
        eq(auditLog.entityId, requestId),
      ),
    )
    .orderBy(asc(auditLog.createdAt));
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.actorName,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getRequestTimeline(requestId: string) {
  return loadRequestTimeline(db, requestId);
}

export type RequestReviewWarning = {
  kind: "conflict" | "stock" | "condition";
  message: string;
};

export type RequestReviewContext = {
  request: RequestDto;
  equipment: Array<{
    itemId: string;
    unitCode: string;
    unitLabel: string;
    assetCode: string;
    assetName: string;
    classification: "INSTRUMENT" | "TOOL";
    usageType: "BORROWABLE" | "USAGE_ONLY";
    unitStatus: string;
    condition: string;
    roomCode: string;
    roomName: string;
    imageMediaId: string | null;
    conflicts: Array<{
      requestId: string;
      requestCode: string;
      actorName: string;
      startAt: string;
      endAt: string;
    }>;
  }>;
  materials: Array<{
    itemId: string;
    code: string;
    name: string;
    requested: number;
    unit: string;
    imageMediaId: string | null;
    physical: number;
    reserved: number;
    available: number;
    sufficient: boolean;
    batches: Array<{
      lotNumber: string | null;
      roomName: string;
      quantity: number;
      reserved: number;
      expiryDate: string | null;
    }>;
  }>;
  warnings: RequestReviewWarning[];
};

// Everything a reviewer needs before deciding: current unit condition, other
// reservations that overlap the slot, and the stock position per material.
export async function getRequestReviewContext(
  requestId: string,
): Promise<RequestReviewContext> {
  const request = await loadRequestDto(db, requestId);
  const [instrumentRows, toolRows] = await Promise.all([
    db
      .select({
        itemId: instrumentRequestItem.id,
        unitId: instrumentUnit.id,
        unitCode: instrumentUnit.code,
        unitLabel: instrumentUnit.label,
        unitStatus: instrumentUnit.status,
        unitCondition: instrumentUnit.condition,
        assetCode: instrumentAsset.assetCode,
        assetName: instrumentType.name,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
        assetCondition: instrumentAsset.condition,
        usageType: instrumentType.usageType,
        assetImageMediaId: instrumentAsset.imageMediaId,
        typeImageMediaId: instrumentType.imageMediaId,
        roomCode: room.code,
        roomName: room.name,
      })
      .from(instrumentRequestItem)
      .innerJoin(
        instrumentUnit,
        eq(instrumentUnit.id, instrumentRequestItem.instrumentUnitId),
      )
      .innerJoin(
        instrumentAsset,
        eq(instrumentAsset.id, instrumentRequestItem.instrumentAssetId),
      )
      .innerJoin(
        instrumentType,
        eq(instrumentType.id, instrumentAsset.instrumentTypeId),
      )
      .innerJoin(room, eq(room.id, instrumentAsset.roomId))
      .where(eq(instrumentRequestItem.requestId, requestId)),
    db
      .select({
        itemId: toolRequestItem.id,
        unitId: toolUnit.id,
        unitCode: toolUnit.code,
        unitLabel: toolUnit.label,
        unitStatus: toolUnit.status,
        unitCondition: toolUnit.condition,
        assetCode: toolAsset.assetCode,
        assetName: toolType.name,
        classification: sql<"TOOL">`'TOOL'`,
        assetCondition: toolAsset.condition,
        usageType: toolType.usageType,
        assetImageMediaId: toolAsset.imageMediaId,
        typeImageMediaId: toolType.imageMediaId,
        roomCode: room.code,
        roomName: room.name,
      })
      .from(toolRequestItem)
      .innerJoin(toolUnit, eq(toolUnit.id, toolRequestItem.toolUnitId))
      .innerJoin(toolAsset, eq(toolAsset.id, toolRequestItem.toolAssetId))
      .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
      .innerJoin(room, eq(room.id, toolAsset.roomId))
      .where(eq(toolRequestItem.requestId, requestId)),
  ]);
  const equipmentRows = [...instrumentRows, ...toolRows];

  const conflictRows = equipmentRows.length
    ? await db
        .select({
          unitId: sql<string>`COALESCE(${reservation.instrumentUnitId}, ${reservation.toolUnitId})`,
          requestId: reservation.requestId,
          requestCode: resourceRequest.code,
          actorName: user.name,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
        })
        .from(reservation)
        .innerJoin(
          resourceRequest,
          eq(resourceRequest.id, reservation.requestId),
        )
        .innerJoin(user, eq(user.id, reservation.primaryUserId))
        .where(
          and(
            or(
              inArray(
                reservation.instrumentUnitId,
                equipmentRows.map((row) => row.unitId),
              ),
              inArray(
                reservation.toolUnitId,
                equipmentRows.map((row) => row.unitId),
              ),
            ),
            inArray(reservation.status, [...conflictStatuses]),
            ne(reservation.requestId, requestId),
            sql`${reservation.startAt} < ${new Date(request.endAt)}`,
            sql`${reservation.endAt} > ${new Date(request.startAt)}`,
          ),
        )
    : [];

  const materialRows = await db
    .select({
      itemId: materialRequestItem.id,
      materialId: materialRequestItem.materialId,
      requested: materialRequestItem.requestedQuantity,
      unit: materialRequestItem.unit,
      code: material.code,
      name: material.name,
      imageMediaId: material.imageMediaId,
    })
    .from(materialRequestItem)
    .innerJoin(material, eq(material.id, materialRequestItem.materialId))
    .where(eq(materialRequestItem.requestId, requestId));

  // Materials belong to the request's lab, so review only shows that lab's
  // batches and totals.
  const [requestRoom] = await db
    .select({ id: room.id })
    .from(room)
    .where(eq(room.code, request.roomCode))
    .limit(1);
  const requestRoomId = requestRoom?.id ?? null;

  const batchRows = materialRows.length
    ? await db
        .select({
          materialId: materialBatch.materialId,
          lotNumber: materialBatch.lotNumber,
          quantity: materialBatch.quantity,
          expiryDate: materialBatch.expiryDate,
          roomName: room.name,
        })
        .from(materialBatch)
        .innerJoin(room, eq(room.id, materialBatch.roomId))
        .where(
          and(
            inArray(
              materialBatch.materialId,
              materialRows.map((row) => row.materialId),
            ),
            eq(materialBatch.active, true),
            requestRoomId
              ? eq(materialBatch.roomId, requestRoomId)
              : sql`1 = 0`,
          ),
        )
    : [];
  const stockRows = materialRows.length
    ? (
        await listBatchStock(
          db,
          materialRows.map((row) => row.materialId),
        )
      ).filter((row) => row.roomId === requestRoomId)
    : [];

  const warnings: RequestReviewWarning[] = [];
  const equipment = equipmentRows.map((row) => {
    const conflicts = conflictRows
      .filter((conflict) => conflict.unitId === row.unitId)
      .map((conflict) => ({
        requestId: conflict.requestId,
        requestCode: conflict.requestCode,
        actorName: conflict.actorName,
        startAt: conflict.startAt.toISOString(),
        endAt: conflict.endAt.toISOString(),
      }));
    if (conflicts.length > 0)
      warnings.push({
        kind: "conflict",
        message: `${row.unitCode} sudah dipesan pada slot ini oleh ${conflicts[0].actorName} (${conflicts[0].requestCode}).`,
      });
    if (!["AVAILABLE", "RESERVED"].includes(row.unitStatus))
      warnings.push({
        kind: "condition",
        message: `${row.unitCode} berstatus ${row.unitStatus.toLowerCase()} saat ini.`,
      });
    if (row.unitCondition !== "GOOD")
      warnings.push({
        kind: "condition",
        message: `${row.unitCode} kondisi ${row.unitCondition.replace("_", " ").toLowerCase()}.`,
      });
    return {
      itemId: row.itemId,
      unitCode: row.unitCode,
      unitLabel: row.unitLabel,
      assetCode: row.assetCode,
      assetName: row.assetName,
      classification: row.classification,
      usageType: row.usageType,
      unitStatus: row.unitStatus,
      condition: row.unitCondition ?? row.assetCondition,
      roomCode: row.roomCode,
      roomName: row.roomName,
      imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
      conflicts,
    };
  });

  const materials = materialRows.map((row) => {
    const totals = stockTotalsForMaterial(stockRows, row.materialId);
    const requested = Number(row.requested);
    const sufficient = totals.available + 1e-6 >= requested;
    if (!sufficient)
      warnings.push({
        kind: "stock",
        message: `${row.name} hanya tersedia ${totals.available} ${row.unit}, diminta ${requested} ${row.unit}.`,
      });
    else if (totals.available - requested < 1e-6)
      warnings.push({
        kind: "stock",
        message: `${row.name} akan habis setelah approval ini.`,
      });
    return {
      itemId: row.itemId,
      code: row.code,
      name: row.name,
      requested,
      unit: row.unit,
      imageMediaId: row.imageMediaId ?? null,
      physical: totals.physical,
      reserved: totals.reserved,
      available: totals.available,
      sufficient,
      batches: batchRows
        .filter((batch) => batch.materialId === row.materialId)
        .map((batch) => ({
          lotNumber: batch.lotNumber,
          roomName: batch.roomName,
          quantity: Number(batch.quantity),
          reserved: Number(
            stockRows.find(
              (stock) =>
                stock.materialId === row.materialId &&
                stock.lotNumber === batch.lotNumber,
            )?.reserved ?? 0,
          ),
          expiryDate: batch.expiryDate?.toISOString() ?? null,
        })),
    };
  });

  return { request, equipment, materials, warnings };
}

// APPROVED -> READY_FOR_PICKUP. PLP confirms the resource is prepared and the
// student can be told to collect it.
export async function markRequestReady(actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!current) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (current.status !== "APPROVED")
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Hanya request yang disetujui yang bisa disiapkan.",
      );
    await tx
      .update(resourceRequest)
      .set({ status: "READY_FOR_PICKUP" })
      .where(eq(resourceRequest.id, requestId));
    await createNotification(tx, {
      recipientId: current.studentId,
      type: "REQUEST_READY",
      title: "Resource siap diambil",
      message: `${current.code} sudah disiapkan. Silakan ambil sesuai jadwal.`,
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId,
      action: "PREPARE",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: current.status },
      after: { status: "READY_FOR_PICKUP" },
    });
    return loadRequestDto(tx, requestId);
  });
}

// RETURNED -> COMPLETED after inspection, or ACTIVE -> COMPLETED for usage-only
// equipment that never leaves the room. Releases units and closes reservations.
export async function completeRequest(
  actorId: string,
  requestId: string,
  input: {
    notes: string;
    equipmentStatus?: "AVAILABLE" | "MAINTENANCE";
    unitStatuses?: Array<{
      unitId: string;
      status: "AVAILABLE" | "MAINTENANCE";
    }>;
  },
) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!request) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (!["RETURNED", "ACTIVE", "OVERDUE"].includes(request.status))
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Request ini tidak bisa diselesaikan pada state sekarang.",
      );

    if (request.status !== "RETURNED") {
      const openBorrowableInstrument = await tx
        .select({ id: issueTransaction.id })
        .from(issueTransaction)
        .innerJoin(
          instrumentAsset,
          eq(instrumentAsset.id, issueTransaction.instrumentAssetId),
        )
        .innerJoin(
          instrumentType,
          eq(instrumentType.id, instrumentAsset.instrumentTypeId),
        )
        .leftJoin(
          returnTransaction,
          eq(returnTransaction.issueTransactionId, issueTransaction.id),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            eq(instrumentType.usageType, "BORROWABLE"),
            isNull(returnTransaction.id),
          ),
        )
        .limit(1);

      const openBorrowableTool =
        openBorrowableInstrument.length === 0
          ? await tx
              .select({ id: issueTransaction.id })
              .from(issueTransaction)
              .innerJoin(
                toolAsset,
                eq(toolAsset.id, issueTransaction.toolAssetId),
              )
              .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
              .leftJoin(
                returnTransaction,
                eq(returnTransaction.issueTransactionId, issueTransaction.id),
              )
              .where(
                and(
                  eq(issueTransaction.requestId, requestId),
                  eq(toolType.usageType, "BORROWABLE"),
                  isNull(returnTransaction.id),
                ),
              )
              .limit(1)
          : [];

      if (openBorrowableInstrument.length > 0 || openBorrowableTool.length > 0)
        throw new ApiError(
          409,
          "OUTSTANDING_RETURN",
          "Equipment borrowable masih harus dikembalikan lewat Return.",
        );
    }

    const [instrumentResRows, toolResRows] = await Promise.all([
      tx
        .select({
          id: reservation.id,
          unitId: reservation.instrumentUnitId,
          assetId: reservation.instrumentAssetId,
          kind: sql<"INSTRUMENT">`'INSTRUMENT'`,
        })
        .from(reservation)
        .where(
          and(
            eq(reservation.requestId, requestId),
            isNotNull(reservation.instrumentUnitId),
            isNotNull(reservation.instrumentAssetId),
            inArray(reservation.status, [...conflictStatuses]),
          ),
        )
        .for("update"),
      tx
        .select({
          id: reservation.id,
          unitId: reservation.toolUnitId,
          assetId: reservation.toolAssetId,
          kind: sql<"TOOL">`'TOOL'`,
        })
        .from(reservation)
        .where(
          and(
            eq(reservation.requestId, requestId),
            isNotNull(reservation.toolUnitId),
            isNotNull(reservation.toolAssetId),
            inArray(reservation.status, [...conflictStatuses]),
          ),
        )
        .for("update"),
    ]);
    const reservationRows = [...instrumentResRows, ...toolResRows];

    // Reservations for borrowed units were closed at return, so those units are
    // found through their return transaction. Reservations still active here
    // belong to usage-only equipment and are released directly.
    const [instrumentRetRows, toolRetRows] = await Promise.all([
      tx
        .select({
          unitId: issueTransaction.instrumentUnitId,
          assetId: issueTransaction.instrumentAssetId,
          kind: sql<"INSTRUMENT">`'INSTRUMENT'`,
        })
        .from(returnTransaction)
        .innerJoin(
          issueTransaction,
          eq(issueTransaction.id, returnTransaction.issueTransactionId),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            isNotNull(issueTransaction.instrumentUnitId),
            isNotNull(issueTransaction.instrumentAssetId),
          ),
        ),
      tx
        .select({
          unitId: issueTransaction.toolUnitId,
          assetId: issueTransaction.toolAssetId,
          kind: sql<"TOOL">`'TOOL'`,
        })
        .from(returnTransaction)
        .innerJoin(
          issueTransaction,
          eq(issueTransaction.id, returnTransaction.issueTransactionId),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            isNotNull(issueTransaction.toolUnitId),
            isNotNull(issueTransaction.toolAssetId),
          ),
        ),
    ]);
    const returnedRows = [...instrumentRetRows, ...toolRetRows];

    const targets = new Map<
      string,
      { unitId: string; assetId: string; kind: "INSTRUMENT" | "TOOL" }
    >();
    for (const row of reservationRows)
      if (row.unitId && row.assetId)
        targets.set(row.unitId, {
          unitId: row.unitId,
          assetId: row.assetId,
          kind: row.kind,
        });
    for (const row of returnedRows)
      if (row.unitId && row.assetId && !targets.has(row.unitId))
        targets.set(row.unitId, {
          unitId: row.unitId,
          assetId: row.assetId,
          kind: row.kind,
        });

    for (const row of targets.values()) {
      if (row.kind === "INSTRUMENT") {
        const [unit] = await tx
          .select({
            status: instrumentUnit.status,
            condition: instrumentUnit.condition,
          })
          .from(instrumentUnit)
          .where(eq(instrumentUnit.id, row.unitId))
          .limit(1);
        const unitOverride = input.unitStatuses?.find(
          (u) => u.unitId === row.unitId,
        );
        const inspectionResult =
          unitOverride?.status ??
          input.equipmentStatus ??
          (unit?.condition === "GOOD" ? "AVAILABLE" : "MAINTENANCE");
        const nextStatus =
          unit &&
          ["UNDER_INSPECTION", "IN_USE", "RESERVED"].includes(unit.status)
            ? inspectionResult
            : "AVAILABLE";
        await tx
          .update(instrumentUnit)
          .set({ status: nextStatus })
          .where(eq(instrumentUnit.id, row.unitId));
        if (unit?.status === "UNDER_INSPECTION") {
          await tx.insert(instrumentConditionHistory).values({
            instrumentAssetId: row.assetId,
            instrumentUnitId: row.unitId,
            condition: nextStatus === "MAINTENANCE" ? "MINOR_ISSUE" : "GOOD",
            source: "PLP_INSPECTION",
            recordedById: actorId,
            notes: input.notes || null,
          });
        }
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(instrumentUnit)
          .where(
            and(
              eq(instrumentUnit.instrumentAssetId, row.assetId),
              inArray(instrumentUnit.status, [
                "RESERVED",
                "IN_USE",
                "UNDER_INSPECTION",
              ]),
            ),
          );
        if ((remaining[0]?.count ?? 0) === 0) {
          const attention = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(instrumentUnit)
            .where(
              and(
                eq(instrumentUnit.instrumentAssetId, row.assetId),
                inArray(instrumentUnit.status, ["MAINTENANCE", "DAMAGED"]),
              ),
            );
          await tx
            .update(instrumentAsset)
            .set({
              status:
                (attention[0]?.count ?? 0) > 0 ? "MAINTENANCE" : "AVAILABLE",
            })
            .where(eq(instrumentAsset.id, row.assetId));
        }
      } else {
        const [unit] = await tx
          .select({
            status: toolUnit.status,
            condition: toolUnit.condition,
          })
          .from(toolUnit)
          .where(eq(toolUnit.id, row.unitId))
          .limit(1);
        const unitOverride = input.unitStatuses?.find(
          (u) => u.unitId === row.unitId,
        );
        const inspectionResult =
          unitOverride?.status ??
          input.equipmentStatus ??
          (unit?.condition === "GOOD" ? "AVAILABLE" : "MAINTENANCE");
        const nextStatus =
          unit &&
          ["UNDER_INSPECTION", "IN_USE", "RESERVED"].includes(unit.status)
            ? inspectionResult
            : "AVAILABLE";
        await tx
          .update(toolUnit)
          .set({ status: nextStatus })
          .where(eq(toolUnit.id, row.unitId));
        if (unit?.status === "UNDER_INSPECTION") {
          await tx.insert(toolConditionHistory).values({
            toolAssetId: row.assetId,
            toolUnitId: row.unitId,
            condition: nextStatus === "MAINTENANCE" ? "MINOR_ISSUE" : "GOOD",
            source: "PLP_INSPECTION",
            recordedById: actorId,
            notes: input.notes || null,
          });
        }
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(toolUnit)
          .where(
            and(
              eq(toolUnit.toolAssetId, row.assetId),
              inArray(toolUnit.status, [
                "RESERVED",
                "IN_USE",
                "UNDER_INSPECTION",
              ]),
            ),
          );
        if ((remaining[0]?.count ?? 0) === 0) {
          const attention = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(toolUnit)
            .where(
              and(
                eq(toolUnit.toolAssetId, row.assetId),
                inArray(toolUnit.status, ["MAINTENANCE", "DAMAGED"]),
              ),
            );
          await tx
            .update(toolAsset)
            .set({
              status:
                (attention[0]?.count ?? 0) > 0 ? "MAINTENANCE" : "AVAILABLE",
            })
            .where(eq(toolAsset.id, row.assetId));
        }
      }
    }

    await tx
      .update(reservation)
      .set({ status: "COMPLETED" })
      .where(
        and(
          eq(reservation.requestId, requestId),
          inArray(reservation.status, [...conflictStatuses]),
        ),
      );

    await tx
      .update(resourceRequest)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(resourceRequest.id, requestId));
    await createNotification(tx, {
      recipientId: request.studentId,
      type: "REQUEST_COMPLETED",
      title: "Request selesai",
      message: `${request.code} sudah selesai. Terima kasih sudah mengembalikan resource.`,
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId,
      action: "COMPLETE",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "COMPLETED" },
      reason: input.notes || undefined,
    });
    return loadRequestDto(tx, requestId);
  });
}

// Overdue automation and reservation reminders run lazily when PLP opens the
// workspace, so the data is correct without an external scheduler.
export async function runRequestMaintenance(actorId: string) {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return db.transaction(async (tx) => {
    const lockResult = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(hashtext('reaksan_request_maintenance')) AS locked`,
    );
    if (!lockResult.rows[0]?.locked) {
      return { overdue: 0, reminders: 0 };
    }

    const overdue = await tx
      .select({
        id: resourceRequest.id,
        code: resourceRequest.code,
        studentId: resourceRequest.studentId,
      })
      .from(resourceRequest)
      .where(
        and(
          inArray(resourceRequest.status, [
            "APPROVED",
            "READY_FOR_PICKUP",
            "ACTIVE",
          ]),
          sql`${resourceRequest.endAt} < ${now}`,
        ),
      )
      .limit(200)
      .for("update", { skipLocked: true });
    for (const request of overdue) {
      await tx
        .update(resourceRequest)
        .set({ status: "OVERDUE" })
        .where(eq(resourceRequest.id, request.id));
      await createNotification(tx, {
        recipientId: request.studentId,
        type: "REQUEST_OVERDUE",
        title: "Request melewati tenggat",
        message: `${request.code} melewati tenggat. Hubungi PLP untuk menyelesaikan.`,
        referenceType: "resource_request",
        referenceId: request.id,
      });
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "resource_request",
        entityId: request.id,
        after: { status: "OVERDUE" },
        reason: "Otomatisasi overdue",
      });
    }

    const upcoming = await tx
      .select({
        id: resourceRequest.id,
        code: resourceRequest.code,
        studentId: resourceRequest.studentId,
        startAt: resourceRequest.startAt,
      })
      .from(resourceRequest)
      .where(
        and(
          inArray(resourceRequest.status, ["APPROVED", "READY_FOR_PICKUP"]),
          gte(resourceRequest.startAt, now),
          lte(resourceRequest.startAt, reminderWindow),
        ),
      )
      .limit(200);
    let reminders = 0;
    for (const request of upcoming) {
      const [existing] = await tx
        .select({ id: auditLog.id })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityType, "resource_request"),
            eq(auditLog.entityId, request.id),
            eq(auditLog.action, "UPDATE"),
            eq(auditLog.reason, "Reminder reservasi"),
          ),
        )
        .limit(1);
      if (existing) continue;
      await createNotification(tx, {
        recipientId: request.studentId,
        type: "REQUEST_REMINDER",
        title: "Jadwal resource sebentar lagi",
        message: `${request.code} mulai dalam 24 jam. Pastikan sudah siap.`,
        referenceType: "resource_request",
        referenceId: request.id,
      });
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "resource_request",
        entityId: request.id,
        reason: "Reminder reservasi",
      });
      reminders += 1;
    }
    return { overdue: overdue.length, reminders };
  });
}

export async function createRequest(userId: string, input: CreateRequestInput) {
  return db.transaction(async (tx) => {
    const [roomRow] = await tx
      .select()
      .from(room)
      .where(and(eq(room.code, input.roomCode), eq(room.active, true)))
      .limit(1);
    if (!roomRow)
      throw new ApiError(422, "ROOM_NOT_FOUND", "Room is not available.");
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    const equipmentRows = await resolveEquipment(
      tx,
      roomRow.id,
      roomRow.name,
      input.equipment.map((item) => item.unitCode),
    );
    await lockEquipmentUnits(tx, equipmentRows);
    await assertNoReservationConflict(
      tx,
      equipmentRows.map((row) => row.unitId),
      startAt,
      endAt,
    );
    const materialRows = await resolveMaterials(
      tx,
      roomRow.id,
      roomRow.name,
      input.materials,
    );
    const [actor] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const requestActivity = await ensureDefaultActivity(
      tx,
      userId,
      input.title,
    );
    const code = await requestCode(tx);
    const [created] = await tx
      .insert(resourceRequest)
      .values({
        code,
        activityId: requestActivity.id,
        studentId: userId,
        roomId: roomRow.id,
        supervisorName: input.supervisor,
        fieldPicName: input.fieldPic,
        title: input.title,
        purpose: input.purpose,
        mode: "BORROW",
        startAt,
        endAt,
        practicalPlan: { note: input.purpose, fieldPic: input.fieldPic },
        status: "PENDING_PLP",
        submittedAt: new Date(),
      })
      .returning({ id: resourceRequest.id });

    for (const item of equipmentRows) {
      const detail = input.equipment.find(
        (entry) => entry.unitCode === item.unitCode,
      );
      if (item.classification === "INSTRUMENT") {
        await tx.insert(instrumentRequestItem).values({
          requestId: created.id,
          instrumentAssetId: item.assetId,
          instrumentUnitId: item.unitId,
          startAt,
          endAt,
          purpose: detail?.purpose ?? null,
        });
      } else {
        await tx.insert(toolRequestItem).values({
          requestId: created.id,
          toolAssetId: item.assetId,
          toolUnitId: item.unitId,
          startAt,
          endAt,
          purpose: detail?.purpose ?? null,
        });
      }
    }
    for (const item of materialRows) {
      await tx.insert(materialRequestItem).values({
        requestId: created.id,
        materialId: item.materialId,
        requestedQuantity: item.quantity.toFixed(3),
        unit: item.unit,
      });
    }

    const staff = await listStaffRecipients(tx, roomRow.id);
    await createNotifications(
      tx,
      staff.map((recipientId) => ({
        recipientId,
        type: "REQUEST_SUBMITTED" as const,
        title: "Request baru menunggu review",
        message: `${actor?.name ?? "Mahasiswa"} mengirim ${code} di ${roomRow.name}.`,
        referenceType: "resource_request",
        referenceId: created.id,
      })),
    );
    await createNotification(tx, {
      recipientId: userId,
      type: "REQUEST_SUBMITTED",
      title: "Request terkirim",
      message: `${code} tersimpan dan menunggu review PLP.`,
      referenceType: "resource_request",
      referenceId: created.id,
    });
    await writeAudit(tx, {
      actorId: userId,
      action: "SUBMIT",
      entityType: "resource_request",
      entityId: created.id,
      after: { code, room: roomRow.code },
    });
    return loadRequestDto(tx, created.id);
  });
}

export async function updateRequest(
  userId: string,
  requestId: string,
  input: CreateRequestInput,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(resourceRequest)
      .where(
        and(
          eq(resourceRequest.id, requestId),
          eq(resourceRequest.studentId, userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!current) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (!["PENDING_PLP", "REQUEST_REVISION", "DRAFT"].includes(current.status))
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Hanya request yang belum disetujui yang bisa diubah.",
      );
    const [roomRow] = await tx
      .select()
      .from(room)
      .where(and(eq(room.code, input.roomCode), eq(room.active, true)))
      .limit(1);
    if (!roomRow)
      throw new ApiError(422, "ROOM_NOT_FOUND", "Room is not available.");
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    const equipmentRows = await resolveEquipment(
      tx,
      roomRow.id,
      roomRow.name,
      input.equipment.map((item) => item.unitCode),
    );
    await lockEquipmentUnits(tx, equipmentRows);
    await assertNoReservationConflict(
      tx,
      equipmentRows.map((row) => row.unitId),
      startAt,
      endAt,
      requestId,
    );
    const materialRows = await resolveMaterials(
      tx,
      roomRow.id,
      roomRow.name,
      input.materials,
    );

    await tx
      .delete(instrumentRequestItem)
      .where(eq(instrumentRequestItem.requestId, requestId));
    await tx
      .delete(toolRequestItem)
      .where(eq(toolRequestItem.requestId, requestId));
    await tx
      .delete(materialRequestItem)
      .where(eq(materialRequestItem.requestId, requestId));
    for (const item of equipmentRows) {
      const detail = input.equipment.find(
        (entry) => entry.unitCode === item.unitCode,
      );
      if (item.classification === "INSTRUMENT") {
        await tx.insert(instrumentRequestItem).values({
          requestId,
          instrumentAssetId: item.assetId,
          instrumentUnitId: item.unitId,
          startAt,
          endAt,
          purpose: detail?.purpose ?? null,
        });
      } else {
        await tx.insert(toolRequestItem).values({
          requestId,
          toolAssetId: item.assetId,
          toolUnitId: item.unitId,
          startAt,
          endAt,
          purpose: detail?.purpose ?? null,
        });
      }
    }
    for (const item of materialRows) {
      await tx.insert(materialRequestItem).values({
        requestId,
        materialId: item.materialId,
        requestedQuantity: item.quantity.toFixed(3),
        unit: item.unit,
      });
    }

    const resubmit = current.status === "REQUEST_REVISION";
    const [updated] = await tx
      .update(resourceRequest)
      .set({
        roomId: roomRow.id,
        supervisorName: input.supervisor,
        fieldPicName: input.fieldPic,
        title: input.title,
        purpose: input.purpose,
        startAt,
        endAt,
        status: "PENDING_PLP",
        revisionNote: null,
        submittedAt: new Date(),
      })
      .where(eq(resourceRequest.id, requestId))
      .returning({ code: resourceRequest.code });
    if (resubmit) {
      const staff = await listStaffRecipients(tx, roomRow.id);
      await createNotifications(
        tx,
        staff.map((recipientId) => ({
          recipientId,
          type: "REQUEST_SUBMITTED" as const,
          title: "Request dikirim ulang",
          message: `${updated.code} dikirim ulang setelah revisi.`,
          referenceType: "resource_request",
          referenceId: requestId,
        })),
      );
    }
    await writeAudit(tx, {
      actorId: userId,
      action: resubmit ? "SUBMIT" : "UPDATE",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: current.status },
      after: { status: "PENDING_PLP" },
    });
    return loadRequestDto(tx, requestId);
  });
}

export async function cancelRequest(userId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(resourceRequest)
      .where(
        and(
          eq(resourceRequest.id, requestId),
          eq(resourceRequest.studentId, userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!current) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (
      ![
        "PENDING_PLP",
        "REQUEST_REVISION",
        "APPROVED",
        "READY_FOR_PICKUP",
      ].includes(current.status)
    )
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Request ini tidak bisa dibatalkan lagi.",
      );

    const issuedRows = await tx
      .select({ id: stockTransaction.id })
      .from(stockTransaction)
      .where(
        and(
          eq(stockTransaction.referenceType, "resource_request"),
          eq(stockTransaction.referenceId, requestId),
          eq(stockTransaction.type, "ISSUE"),
        ),
      );
    if (issuedRows.length === 0) {
      const reservedRows = await tx
        .select({
          id: stockTransaction.id,
          batchId: stockTransaction.materialBatchId,
          quantity: stockTransaction.quantity,
        })
        .from(stockTransaction)
        .where(
          and(
            eq(stockTransaction.referenceType, "resource_request"),
            eq(stockTransaction.referenceId, requestId),
            eq(stockTransaction.type, "RESERVE"),
          ),
        );
      if (reservedRows.length > 0) {
        const batchIds = [
          ...new Set(reservedRows.map((row) => row.batchId)),
        ].sort();
        await tx
          .select({ id: materialBatch.id })
          .from(materialBatch)
          .where(inArray(materialBatch.id, batchIds))
          .orderBy(materialBatch.id)
          .for("update");
        const balanceRows = await tx
          .select({
            batchId: stockTransaction.materialBatchId,
            reserved: sql<string>`COALESCE(SUM(CASE
              WHEN ${stockTransaction.type} = 'RESERVE' THEN ${stockTransaction.quantity}
              WHEN ${stockTransaction.type} IN ('RELEASE', 'ISSUE') THEN -${stockTransaction.quantity}
              ELSE 0
            END), 0)`,
          })
          .from(stockTransaction)
          .where(inArray(stockTransaction.materialBatchId, batchIds))
          .groupBy(stockTransaction.materialBatchId);
        const currentReserved = new Map(
          balanceRows.map((row) => [
            row.batchId,
            Math.max(0, Number(row.reserved)),
          ]),
        );
        for (const row of reservedRows) {
          const qty = Number(row.quantity);
          const before = currentReserved.get(row.batchId) ?? 0;
          const after = Math.max(0, Math.round((before - qty) * 1000) / 1000);
          currentReserved.set(row.batchId, after);
          await recordStockTransaction(tx, {
            batchId: row.batchId,
            type: "RELEASE",
            quantity: qty,
            before,
            after,
            referenceType: "resource_request",
            referenceId: requestId,
            performedById: userId,
            reason: `Request ${current.code} dibatalkan`,
          });
        }
      }
      await tx
        .update(materialRequestItem)
        .set({ allocatedBatchId: null })
        .where(eq(materialRequestItem.requestId, requestId));
    }

    const reservationRows = await tx
      .select({
        id: reservation.id,
        instrumentUnitId: reservation.instrumentUnitId,
        toolUnitId: reservation.toolUnitId,
      })
      .from(reservation)
      .where(eq(reservation.requestId, requestId));
    for (const row of reservationRows) {
      await tx
        .update(reservation)
        .set({ status: "CANCELLED" })
        .where(eq(reservation.id, row.id));
      if (row.instrumentUnitId) {
        const [other] = await tx
          .select({ id: reservation.id })
          .from(reservation)
          .where(
            and(
              eq(reservation.instrumentUnitId, row.instrumentUnitId),
              inArray(reservation.status, [...conflictStatuses]),
              ne(reservation.id, row.id),
            ),
          )
          .limit(1);
        if (!other) {
          await tx
            .update(instrumentUnit)
            .set({ status: "AVAILABLE" })
            .where(
              and(
                eq(instrumentUnit.id, row.instrumentUnitId),
                eq(instrumentUnit.status, "RESERVED"),
              ),
            );
        }
      } else if (row.toolUnitId) {
        const [other] = await tx
          .select({ id: reservation.id })
          .from(reservation)
          .where(
            and(
              eq(reservation.toolUnitId, row.toolUnitId),
              inArray(reservation.status, [...conflictStatuses]),
              ne(reservation.id, row.id),
            ),
          )
          .limit(1);
        if (!other) {
          await tx
            .update(toolUnit)
            .set({ status: "AVAILABLE" })
            .where(
              and(
                eq(toolUnit.id, row.toolUnitId),
                eq(toolUnit.status, "RESERVED"),
              ),
            );
        }
      }
    }

    const [updated] = await tx
      .update(resourceRequest)
      .set({ status: "CANCELLED" })
      .where(eq(resourceRequest.id, requestId))
      .returning({ code: resourceRequest.code });
    await createNotification(tx, {
      recipientId: userId,
      type: "REQUEST_CANCELLED",
      title: "Request dibatalkan",
      message: `${updated.code} dibatalkan. Stok dan slot yang dipesan sudah dilepas.`,
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId: userId,
      action: "CANCEL",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: current.status },
      after: { status: "CANCELLED" },
    });
    return loadRequestDto(tx, requestId);
  });
}

export type ReviewAction = "approve" | "reject" | "revision";

export async function reviewRequest(
  actorId: string,
  requestId: string,
  action: ReviewAction,
  note: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!current || current.status !== "PENDING_PLP")
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Request ini tidak menunggu review.",
      );

    if (action !== "approve") {
      const nextStatus = action === "reject" ? "REJECTED" : "REQUEST_REVISION";
      await tx
        .update(resourceRequest)
        .set(
          action === "reject"
            ? {
                status: "REJECTED",
                rejectionReason: note || "Tidak memenuhi syarat.",
              }
            : {
                status: "REQUEST_REVISION",
                revisionNote: note || "Perlu revisi.",
              },
        )
        .where(eq(resourceRequest.id, requestId))
        .returning({ code: resourceRequest.code });
      await createNotification(tx, {
        recipientId: current.studentId,
        type: action === "reject" ? "REQUEST_REJECTED" : "REQUEST_REVISION",
        title: action === "reject" ? "Request ditolak" : "Revisi diminta",
        message:
          action === "reject"
            ? `${current.code} ditolak. ${note}`.trim()
            : `${current.code} perlu direvisi. ${note}`.trim(),
        referenceType: "resource_request",
        referenceId: requestId,
      });
      await writeAudit(tx, {
        actorId,
        action: action === "reject" ? "REJECT" : "REQUEST_REVISION",
        entityType: "resource_request",
        entityId: requestId,
        before: { status: "PENDING_PLP" },
        after: { status: nextStatus },
        reason: note,
      });
      return loadRequestDto(tx, requestId);
    }

    const [instrumentItems, toolItems] = await Promise.all([
      tx
        .select({
          itemId: instrumentRequestItem.id,
          unitId: instrumentRequestItem.instrumentUnitId,
          assetId: instrumentRequestItem.instrumentAssetId,
          unitCode: instrumentUnit.code,
          unitStatus: instrumentUnit.status,
          startAt: instrumentRequestItem.startAt,
          endAt: instrumentRequestItem.endAt,
          purpose: instrumentRequestItem.purpose,
          kind: sql<"INSTRUMENT">`'INSTRUMENT'`,
        })
        .from(instrumentRequestItem)
        .innerJoin(
          instrumentUnit,
          eq(instrumentUnit.id, instrumentRequestItem.instrumentUnitId),
        )
        .where(eq(instrumentRequestItem.requestId, requestId))
        .for("update"),
      tx
        .select({
          itemId: toolRequestItem.id,
          unitId: toolRequestItem.toolUnitId,
          assetId: toolRequestItem.toolAssetId,
          unitCode: toolUnit.code,
          unitStatus: toolUnit.status,
          startAt: toolRequestItem.startAt,
          endAt: toolRequestItem.endAt,
          purpose: toolRequestItem.purpose,
          kind: sql<"TOOL">`'TOOL'`,
        })
        .from(toolRequestItem)
        .innerJoin(toolUnit, eq(toolUnit.id, toolRequestItem.toolUnitId))
        .where(eq(toolRequestItem.requestId, requestId))
        .for("update"),
    ]);
    const equipmentItems = [...instrumentItems, ...toolItems];
    for (const item of equipmentItems) {
      if (item.unitStatus !== "AVAILABLE")
        throw new ApiError(
          409,
          "UNIT_UNAVAILABLE",
          `${item.unitCode} tidak tersedia saat approval.`,
        );
    }
    if (equipmentItems.length > 0)
      await assertNoReservationConflict(
        tx,
        equipmentItems.map((item) => item.unitId),
        current.startAt,
        current.endAt,
      );

    const materialItems = await tx
      .select({
        itemId: materialRequestItem.id,
        materialId: materialRequestItem.materialId,
        quantity: materialRequestItem.requestedQuantity,
        unit: materialRequestItem.unit,
        name: material.name,
      })
      .from(materialRequestItem)
      .innerJoin(material, eq(material.id, materialRequestItem.materialId))
      .where(eq(materialRequestItem.requestId, requestId));
    if (materialItems.length > 0) {
      const batchRows = await listBatchStock(
        tx,
        materialItems.map((item) => item.materialId),
        { forUpdate: true },
      );
      for (const item of materialItems) {
        const materialBatches = batchRows.filter(
          (batch) =>
            batch.materialId === item.materialId &&
            batch.roomId === current.roomId,
        );
        const totals = stockTotalsForMaterial(materialBatches, item.materialId);
        const quantity = Number(item.quantity);
        if (quantity > totals.available + 1e-6)
          throw new ApiError(
            409,
            "INSUFFICIENT_STOCK",
            `${item.name} tidak lagi cukup saat approval.`,
          );
        const allocations = allocateStock(materialBatches, quantity);
        if (!allocations)
          throw new ApiError(
            409,
            "INSUFFICIENT_STOCK",
            `${item.name} tidak lagi cukup saat approval.`,
          );
        for (const allocation of allocations) {
          await recordStockTransaction(tx, {
            batchId: allocation.batchId,
            type: "RESERVE",
            quantity: allocation.quantity,
            before: allocation.before,
            after: allocation.after,
            referenceType: "resource_request",
            referenceId: requestId,
            performedById: actorId,
            reason: `Reservasi ${current.code}`,
          });
        }
        await tx
          .update(materialRequestItem)
          .set({ allocatedBatchId: allocations[0]?.batchId ?? null })
          .where(eq(materialRequestItem.id, item.itemId));
      }
    }

    for (const item of equipmentItems) {
      if (item.kind === "INSTRUMENT") {
        await tx.insert(reservation).values({
          instrumentAssetId: item.assetId,
          instrumentUnitId: item.unitId,
          requestId,
          primaryUserId: current.studentId,
          startAt: item.startAt,
          endAt: item.endAt,
          status: "RESERVED",
          purpose: item.purpose,
        });
        await tx
          .update(instrumentUnit)
          .set({ status: "RESERVED" })
          .where(eq(instrumentUnit.id, item.unitId));
      } else {
        await tx.insert(reservation).values({
          toolAssetId: item.assetId,
          toolUnitId: item.unitId,
          requestId,
          primaryUserId: current.studentId,
          startAt: item.startAt,
          endAt: item.endAt,
          status: "RESERVED",
          purpose: item.purpose,
        });
        await tx
          .update(toolUnit)
          .set({ status: "RESERVED" })
          .where(eq(toolUnit.id, item.unitId));
      }
    }

    await tx
      .update(resourceRequest)
      .set({ status: "APPROVED", approvedAt: new Date() })
      .where(eq(resourceRequest.id, requestId));
    await createNotification(tx, {
      recipientId: current.studentId,
      type: "REQUEST_APPROVED",
      title: "Request disetujui",
      message: `${current.code} disetujui oleh PLP. ${note}`.trim(),
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId,
      action: "APPROVE",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: "PENDING_PLP" },
      after: { status: "APPROVED" },
    });
    return loadRequestDto(tx, requestId);
  });
}

export async function issueRequest(actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!request) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (!["APPROVED", "READY_FOR_PICKUP", "OVERDUE"].includes(request.status))
      throw new ApiError(409, "INVALID_STATE", "Request belum siap di-issue.");

    const [instrumentReservationRows, toolReservationRows] = await Promise.all([
      tx
        .select({
          id: reservation.id,
          unitId: reservation.instrumentUnitId,
          assetId: reservation.instrumentAssetId,
          condition: instrumentAsset.condition,
          kind: sql<"INSTRUMENT">`'INSTRUMENT'`,
        })
        .from(reservation)
        .innerJoin(
          instrumentAsset,
          eq(instrumentAsset.id, reservation.instrumentAssetId),
        )
        .where(
          and(
            eq(reservation.requestId, requestId),
            eq(reservation.status, "RESERVED"),
            isNotNull(reservation.instrumentAssetId),
          ),
        )
        .for("update"),
      tx
        .select({
          id: reservation.id,
          unitId: reservation.toolUnitId,
          assetId: reservation.toolAssetId,
          condition: toolAsset.condition,
          kind: sql<"TOOL">`'TOOL'`,
        })
        .from(reservation)
        .innerJoin(toolAsset, eq(toolAsset.id, reservation.toolAssetId))
        .where(
          and(
            eq(reservation.requestId, requestId),
            eq(reservation.status, "RESERVED"),
            isNotNull(reservation.toolAssetId),
          ),
        )
        .for("update"),
    ]);
    const reservationRows = [
      ...instrumentReservationRows,
      ...toolReservationRows,
    ];
    for (const item of reservationRows) {
      if (item.kind === "INSTRUMENT") {
        await tx.insert(issueTransaction).values({
          requestId,
          instrumentAssetId: item.assetId,
          instrumentUnitId: item.unitId,
          issuedToId: request.studentId,
          issuedById: actorId,
          conditionAtIssue: item.condition,
        });
        await tx
          .update(reservation)
          .set({ status: "ACTIVE" })
          .where(eq(reservation.id, item.id));
        if (item.unitId) {
          await tx
            .update(instrumentUnit)
            .set({ status: "IN_USE" })
            .where(eq(instrumentUnit.id, item.unitId));
        }
      } else {
        await tx.insert(issueTransaction).values({
          requestId,
          toolAssetId: item.assetId,
          toolUnitId: item.unitId,
          issuedToId: request.studentId,
          issuedById: actorId,
          conditionAtIssue: item.condition,
        });
        await tx
          .update(reservation)
          .set({ status: "ACTIVE" })
          .where(eq(reservation.id, item.id));
        if (item.unitId) {
          await tx
            .update(toolUnit)
            .set({ status: "IN_USE" })
            .where(eq(toolUnit.id, item.unitId));
        }
      }
    }

    const issuedRows = await tx
      .select({ id: stockTransaction.id })
      .from(stockTransaction)
      .where(
        and(
          eq(stockTransaction.referenceType, "resource_request"),
          eq(stockTransaction.referenceId, requestId),
          eq(stockTransaction.type, "ISSUE"),
        ),
      );
    if (issuedRows.length === 0) {
      const reserveRows = await tx
        .select({
          id: stockTransaction.id,
          batchId: stockTransaction.materialBatchId,
          quantity: stockTransaction.quantity,
        })
        .from(stockTransaction)
        .where(
          and(
            eq(stockTransaction.referenceType, "resource_request"),
            eq(stockTransaction.referenceId, requestId),
            eq(stockTransaction.type, "RESERVE"),
          ),
        );
      for (const row of reserveRows) {
        const [batch] = await tx
          .select()
          .from(materialBatch)
          .where(eq(materialBatch.id, row.batchId))
          .limit(1)
          .for("update");
        if (!batch) continue;
        const before = Number(batch.quantity);
        const after = Math.max(0, before - Number(row.quantity));
        await tx
          .update(materialBatch)
          .set({ quantity: after.toFixed(3) })
          .where(eq(materialBatch.id, batch.id));
        await recordStockTransaction(tx, {
          batchId: batch.id,
          type: "ISSUE",
          quantity: Number(row.quantity),
          before,
          after,
          referenceType: "resource_request",
          referenceId: requestId,
          performedById: actorId,
          reason: `Issue ${request.code}`,
        });
      }
    }

    await tx
      .update(resourceRequest)
      .set({ status: "ACTIVE" })
      .where(eq(resourceRequest.id, requestId));
    await createNotification(tx, {
      recipientId: request.studentId,
      type: "EQUIPMENT_ISSUED",
      title: "Resource sedang digunakan",
      message: `${request.code} sudah di-issue dan berstatus aktif.`,
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId,
      action: "ISSUE",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "ACTIVE" },
    });
    return loadRequestDto(tx, requestId);
  });
}

export async function returnRequest(
  actorId: string,
  requestId: string,
  input: {
    condition: "GOOD" | "MINOR_ISSUE" | "DAMAGED" | "UNKNOWN";
    notes: string;
  },
) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!request) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "ACTIVE" && request.status !== "OVERDUE")
      throw new ApiError(409, "INVALID_STATE", "Request belum aktif.");

    const [instrumentIssues, toolIssues] = await Promise.all([
      tx
        .select({
          id: issueTransaction.id,
          assetId: issueTransaction.instrumentAssetId,
          unitId: issueTransaction.instrumentUnitId,
          issuedToId: issueTransaction.issuedToId,
          kind: sql<"INSTRUMENT">`'INSTRUMENT'`,
        })
        .from(issueTransaction)
        .innerJoin(
          instrumentAsset,
          eq(instrumentAsset.id, issueTransaction.instrumentAssetId),
        )
        .innerJoin(
          instrumentType,
          eq(instrumentType.id, instrumentAsset.instrumentTypeId),
        )
        .leftJoin(
          returnTransaction,
          eq(returnTransaction.issueTransactionId, issueTransaction.id),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            isNotNull(issueTransaction.instrumentAssetId),
            isNull(returnTransaction.id),
            eq(instrumentType.usageType, "BORROWABLE"),
          ),
        ),
      tx
        .select({
          id: issueTransaction.id,
          assetId: issueTransaction.toolAssetId,
          unitId: issueTransaction.toolUnitId,
          issuedToId: issueTransaction.issuedToId,
          kind: sql<"TOOL">`'TOOL'`,
        })
        .from(issueTransaction)
        .innerJoin(toolAsset, eq(toolAsset.id, issueTransaction.toolAssetId))
        .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
        .leftJoin(
          returnTransaction,
          eq(returnTransaction.issueTransactionId, issueTransaction.id),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            isNotNull(issueTransaction.toolAssetId),
            isNull(returnTransaction.id),
            eq(toolType.usageType, "BORROWABLE"),
          ),
        ),
    ]);
    const issues = [...instrumentIssues, ...toolIssues];
    if (issues.length === 0)
      throw new ApiError(
        409,
        "NOTHING_TO_RETURN",
        "Tidak ada equipment borrowable yang masih dipinjam. Gunakan Selesaikan penggunaan untuk equipment usage-only.",
      );
    for (const issue of issues) {
      if (!issue.assetId) continue;
      if (issue.kind === "INSTRUMENT") {
        await tx.insert(returnTransaction).values({
          issueTransactionId: issue.id,
          instrumentAssetId: issue.assetId,
          instrumentUnitId: issue.unitId ?? null,
          returnedById: issue.issuedToId,
          receivedById: actorId,
          conditionAtReturn: input.condition,
          notes: input.notes || null,
        });
        await tx
          .update(instrumentAsset)
          .set({ condition: input.condition })
          .where(eq(instrumentAsset.id, issue.assetId));
        if (issue.unitId) {
          await tx
            .update(instrumentUnit)
            .set({ status: "UNDER_INSPECTION", condition: input.condition })
            .where(eq(instrumentUnit.id, issue.unitId));
        }
        await tx.insert(instrumentConditionHistory).values({
          instrumentAssetId: issue.assetId,
          instrumentUnitId: issue.unitId ?? null,
          condition: input.condition,
          source: "RETURN",
          recordedById: actorId,
          notes: input.notes || null,
        });
      } else {
        await tx.insert(returnTransaction).values({
          issueTransactionId: issue.id,
          toolAssetId: issue.assetId,
          toolUnitId: issue.unitId ?? null,
          returnedById: issue.issuedToId,
          receivedById: actorId,
          conditionAtReturn: input.condition,
          notes: input.notes || null,
        });
        await tx
          .update(toolAsset)
          .set({ condition: input.condition })
          .where(eq(toolAsset.id, issue.assetId));
        if (issue.unitId) {
          await tx
            .update(toolUnit)
            .set({ status: "UNDER_INSPECTION", condition: input.condition })
            .where(eq(toolUnit.id, issue.unitId));
        }
        await tx.insert(toolConditionHistory).values({
          toolAssetId: issue.assetId,
          toolUnitId: issue.unitId ?? null,
          condition: input.condition,
          source: "RETURN",
          recordedById: actorId,
          notes: input.notes || null,
        });
      }
    }
    // The borrowable reservation closes at return; completeRequest still finds
    // the unit through its return transaction for the inspection result.
    const returnedUnitIds = issues
      .map((issue) => issue.unitId)
      .filter((unitId): unitId is string => Boolean(unitId));
    if (returnedUnitIds.length > 0)
      await tx
        .update(reservation)
        .set({ status: "COMPLETED" })
        .where(
          and(
            eq(reservation.requestId, requestId),
            inArray(reservation.status, [...conflictStatuses]),
            or(
              inArray(reservation.instrumentUnitId, returnedUnitIds),
              inArray(reservation.toolUnitId, returnedUnitIds),
            ),
          ),
        );

    await tx
      .update(resourceRequest)
      .set({ status: "RETURNED" })
      .where(eq(resourceRequest.id, requestId));
    await createNotification(tx, {
      recipientId: request.studentId,
      type: "EQUIPMENT_RETURNED",
      title: "Resource dikembalikan",
      message: `${request.code} sudah dikembalikan dan menunggu inspeksi.`,
      referenceType: "resource_request",
      referenceId: requestId,
    });
    await writeAudit(tx, {
      actorId,
      action: "RETURN",
      entityType: "resource_request",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "RETURNED" },
      reason: input.notes || undefined,
    });
    return loadRequestDto(tx, requestId);
  });
}

type ReservationLoadOptions = {
  primaryUserId?: string;
  roomCode?: string;
  roomCodes?: string[] | null;
  viewerId?: string;
  from?: Date;
  to?: Date;
  statuses?: ReservationDto["status"][];
};

export async function loadReservations(
  exec: DbExecutor,
  options: ReservationLoadOptions,
): Promise<ReservationDto[]> {
  const instrumentRoom = alias(room, "reservation_instrument_room");
  const toolRoom = alias(room, "reservation_tool_room");

  const conditions = [];
  if (options.primaryUserId)
    conditions.push(eq(reservation.primaryUserId, options.primaryUserId));
  if (options.roomCode)
    conditions.push(
      or(
        eq(instrumentRoom.code, options.roomCode),
        eq(toolRoom.code, options.roomCode),
      ),
    );
  if (options.roomCodes !== undefined)
    conditions.push(
      options.roomCodes === null
        ? sql`true`
        : options.roomCodes.length === 0
          ? sql`false`
          : or(
              inArray(instrumentRoom.code, options.roomCodes),
              inArray(toolRoom.code, options.roomCodes),
            ),
    );
  if (options.statuses?.length)
    conditions.push(inArray(reservation.status, options.statuses));
  if (options.from) conditions.push(gte(reservation.endAt, options.from));
  if (options.to) conditions.push(lte(reservation.startAt, options.to));
  const rows = await exec
    .select({
      id: reservation.id,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      status: reservation.status,
      purpose: reservation.purpose,
      primaryUserId: reservation.primaryUserId,
      primaryUserName: user.name,
      requestId: reservation.requestId,
      requestCode: resourceRequest.code,
      requestTitle: resourceRequest.title,
      requestStatus: resourceRequest.status,
      classification: sql<
        "INSTRUMENT" | "TOOL"
      >`CASE WHEN ${instrumentAsset.id} IS NOT NULL THEN 'INSTRUMENT' ELSE 'TOOL' END`,
      supervisorName: resourceRequest.supervisorName,
      fieldPicName: resourceRequest.fieldPicName,
      unitCode: sql<string>`COALESCE(${instrumentUnit.code}, ${toolUnit.code})`,
      unitLabel: sql<string>`COALESCE(${instrumentUnit.label}, ${toolUnit.label})`,
      assetCode: sql<string>`COALESCE(${instrumentAsset.assetCode}, ${toolAsset.assetCode})`,
      assetName: sql<string>`COALESCE(${instrumentType.name}, ${toolType.name})`,
      assetImageMediaId: sql<
        string | null
      >`COALESCE(${instrumentAsset.imageMediaId}, ${toolAsset.imageMediaId})`,
      typeImageMediaId: sql<
        string | null
      >`COALESCE(${instrumentType.imageMediaId}, ${toolType.imageMediaId})`,
      roomCode: sql<string>`COALESCE(${instrumentRoom.code}, ${toolRoom.code})`,
      roomName: sql<string>`COALESCE(${instrumentRoom.name}, ${toolRoom.name})`,
    })
    .from(reservation)
    .innerJoin(user, eq(user.id, reservation.primaryUserId))
    .innerJoin(resourceRequest, eq(resourceRequest.id, reservation.requestId))
    .leftJoin(
      instrumentUnit,
      eq(instrumentUnit.id, reservation.instrumentUnitId),
    )
    .leftJoin(
      instrumentAsset,
      eq(instrumentAsset.id, reservation.instrumentAssetId),
    )
    .leftJoin(
      instrumentType,
      eq(instrumentType.id, instrumentAsset.instrumentTypeId),
    )
    .leftJoin(instrumentRoom, eq(instrumentRoom.id, instrumentAsset.roomId))
    .leftJoin(toolUnit, eq(toolUnit.id, reservation.toolUnitId))
    .leftJoin(toolAsset, eq(toolAsset.id, reservation.toolAssetId))
    .leftJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
    .leftJoin(toolRoom, eq(toolRoom.id, toolAsset.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(reservation.startAt))
    .limit(500);

  const requestIds = [...new Set(rows.map((r) => r.requestId).filter(Boolean))];
  const [materialRows, issueRows, returnRows] =
    requestIds.length > 0
      ? await Promise.all([
          exec
            .select({
              id: materialRequestItem.id,
              requestId: materialRequestItem.requestId,
              quantity: materialRequestItem.requestedQuantity,
              unit: materialRequestItem.unit,
              code: material.code,
              name: material.name,
              imageMediaId: material.imageMediaId,
            })
            .from(materialRequestItem)
            .innerJoin(
              material,
              eq(material.id, materialRequestItem.materialId),
            )
            .where(inArray(materialRequestItem.requestId, requestIds)),
          exec
            .select({
              requestId: issueTransaction.requestId,
              issuedAt: issueTransaction.issuedAt,
            })
            .from(issueTransaction)
            .where(inArray(issueTransaction.requestId, requestIds))
            .orderBy(asc(issueTransaction.issuedAt)),
          exec
            .select({
              requestId: issueTransaction.requestId,
              returnedAt: returnTransaction.returnedAt,
            })
            .from(returnTransaction)
            .innerJoin(
              issueTransaction,
              eq(issueTransaction.id, returnTransaction.issueTransactionId),
            )
            .where(inArray(issueTransaction.requestId, requestIds))
            .orderBy(asc(returnTransaction.returnedAt)),
        ])
      : [[], [], []];

  const viewerId = options.viewerId;
  return rows.map<ReservationDto>((row) => ({
    id: row.id,
    kind: "reservation",
    unitCode: row.unitCode,
    unitLabel: row.unitLabel,
    assetCode: row.assetCode,
    assetName: row.assetName,
    classification: row.classification,
    roomCode: row.roomCode,
    roomName: row.roomName,
    requestId: row.requestId,
    requestCode: row.requestCode,
    requestTitle: row.requestTitle,
    requestStatus: row.requestStatus,
    primaryUserId: row.primaryUserId,
    primaryUserName: row.primaryUserName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    purpose: row.purpose ?? row.requestTitle,
    mine: viewerId ? row.primaryUserId === viewerId : true,
    imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
    supervisor: row.supervisorName,
    fieldPic: row.fieldPicName,
    materials: materialRows
      .filter((item) => item.requestId === row.requestId)
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        imageMediaId: item.imageMediaId ?? null,
      })),
    issuedAt:
      issueRows
        .find((item) => item.requestId === row.requestId)
        ?.issuedAt.toISOString() ?? null,
    returnedAt:
      returnRows
        .filter((item) => item.requestId === row.requestId)
        .at(-1)
        ?.returnedAt.toISOString() ?? null,
  }));
}

export async function listMyReservations(userId: string) {
  return loadReservations(db, { primaryUserId: userId });
}

export async function listRoomReservations(roomCode: string, userId: string) {
  return loadReservations(db, { roomCode, viewerId: userId });
}

export async function listRoomApprovedRequests(roomCode: string) {
  return loadRequestDtos(db, {
    roomCode,
    statuses: [
      "APPROVED",
      "READY_FOR_PICKUP",
      "ACTIVE",
      "RETURNED",
      "COMPLETED",
      "OVERDUE",
    ],
    limit: 500,
  });
}
