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
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  activity,
  auditLog,
  equipmentAsset,
  equipmentConditionHistory,
  equipmentRequestItem,
  equipmentType,
  equipmentUnit,
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
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
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
  roomCode: string;
  roomName: string;
  requestId: string;
  requestCode: string;
  requestTitle: string;
  primaryUserId: string;
  primaryUserName: string;
  startAt: string;
  endAt: string;
  status: "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  purpose: string;
  mine: boolean;
  imageMediaId: string | null;
};

const conflictStatuses = ["RESERVED", "ACTIVE"] as const;

async function requestCode(exec: DbExecutor) {
  const year = new Date().getFullYear();
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(resourceRequest)
    .where(sql`${resourceRequest.code} LIKE ${`REQ-${year}-%`}`);
  return `REQ-${year}-${String((row?.count ?? 0) + 1).padStart(3, "0")}`;
}

async function ensureDefaultActivity(
  exec: DbExecutor,
  studentId: string,
  requestTitle: string,
) {
  const [existing] = await exec
    .select({ id: activity.id })
    .from(activity)
    .where(and(eq(activity.studentId, studentId), eq(activity.status, "ACTIVE")))
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
  const rows = await exec
    .select({
      unitId: equipmentUnit.id,
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      unitStatus: equipmentUnit.status,
      unitActive: equipmentUnit.active,
      assetId: equipmentAsset.id,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      roomId: equipmentAsset.roomId,
      roomName: room.name,
    })
    .from(equipmentUnit)
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, equipmentUnit.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(inArray(equipmentUnit.code, codes));
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

async function assertNoReservationConflict(
  exec: DbExecutor,
  unitIds: string[],
  startAt: Date,
  endAt: Date,
  excludeRequestId?: string,
) {
  if (unitIds.length === 0) return;
  const filters = [
    inArray(reservation.equipmentUnitId, unitIds),
    inArray(reservation.status, [...conflictStatuses]),
    sql`${reservation.startAt} < ${endAt}`,
    sql`${reservation.endAt} > ${startAt}`,
  ];
  if (excludeRequestId)
    filters.push(ne(reservation.requestId, excludeRequestId));
  const conflicts = await exec
    .select({
      unitCode: equipmentUnit.code,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    })
    .from(reservation)
    .innerJoin(equipmentUnit, eq(equipmentUnit.id, reservation.equipmentUnitId))
    .where(and(...filters))
    .limit(1);
  if (conflicts.length > 0) {
    const conflict = conflicts[0];
    throw new ApiError(
      409,
      "RESERVATION_CONFLICT",
      `${conflict.unitCode} sudah dipesan pada waktu yang dipilih. Pilih slot lain.`,
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
    const increment = Number(row.increment);
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
    const steps = (item.quantity - minimum) / increment;
    if (Math.abs(steps - Math.round(steps)) > 1e-6)
      throw new ApiError(
        422,
        "INVALID_INCREMENT",
        `${row.name} must follow the ${increment} ${unit} dispensing step.`,
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
  limit?: number;
  offset?: number;
};

function requestConditions(options: RequestLoadFilters) {
  const conditions = [];
  if (options.requestId)
    conditions.push(eq(resourceRequest.id, options.requestId));
  if (options.studentId)
    conditions.push(eq(resourceRequest.studentId, options.studentId));
  if (options.statuses?.length)
    conditions.push(inArray(resourceRequest.status, options.statuses));
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
    .orderBy(desc(resourceRequest.startAt))
    .limit(options.limit ?? 200)
    .offset(options.offset ?? 0);
  if (requestRows.length === 0) return [];
  const requestIds = requestRows.map((row) => row.id);

  const equipmentRows = await exec
    .select({
      id: equipmentRequestItem.id,
      requestId: equipmentRequestItem.requestId,
      purpose: equipmentRequestItem.purpose,
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      usageType: equipmentType.usageType,
      assetImageMediaId: equipmentAsset.imageMediaId,
      typeImageMediaId: equipmentType.imageMediaId,
    })
    .from(equipmentRequestItem)
    .innerJoin(
      equipmentUnit,
      eq(equipmentUnit.id, equipmentRequestItem.equipmentUnitId),
    )
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, equipmentRequestItem.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .where(inArray(equipmentRequestItem.requestId, requestIds));

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
      issueRows.find((item) => item.requestId === row.id)?.issuedAt.toISOString() ??
      null,
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
  const equipmentRows = await db
    .select({
      itemId: equipmentRequestItem.id,
      unitId: equipmentUnit.id,
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      unitStatus: equipmentUnit.status,
      unitCondition: equipmentUnit.condition,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      assetCondition: equipmentAsset.condition,
      usageType: equipmentType.usageType,
      assetImageMediaId: equipmentAsset.imageMediaId,
      typeImageMediaId: equipmentType.imageMediaId,
      roomCode: room.code,
      roomName: room.name,
    })
    .from(equipmentRequestItem)
    .innerJoin(
      equipmentUnit,
      eq(equipmentUnit.id, equipmentRequestItem.equipmentUnitId),
    )
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, equipmentRequestItem.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(eq(equipmentRequestItem.requestId, requestId));

  const conflictRows = equipmentRows.length
    ? await db
        .select({
          unitId: reservation.equipmentUnitId,
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
            inArray(
              reservation.equipmentUnitId,
              equipmentRows.map((row) => row.unitId),
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
    if (!current)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
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
    unitStatuses?: Array<{ unitId: string; status: "AVAILABLE" | "MAINTENANCE" }>;
  },
) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(resourceRequest)
      .where(eq(resourceRequest.id, requestId))
      .limit(1)
      .for("update");
    if (!request)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (!["RETURNED", "ACTIVE", "OVERDUE"].includes(request.status))
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Request ini tidak bisa diselesaikan pada state sekarang.",
      );

    if (request.status !== "RETURNED") {
      const openBorrowable = await tx
        .select({ id: issueTransaction.id })
        .from(issueTransaction)
        .innerJoin(
          equipmentAsset,
          eq(equipmentAsset.id, issueTransaction.equipmentAssetId),
        )
        .innerJoin(
          equipmentType,
          eq(equipmentType.id, equipmentAsset.equipmentTypeId),
        )
        .leftJoin(
          returnTransaction,
          eq(returnTransaction.issueTransactionId, issueTransaction.id),
        )
        .where(
          and(
            eq(issueTransaction.requestId, requestId),
            eq(equipmentType.usageType, "BORROWABLE"),
            isNull(returnTransaction.id),
          ),
        )
        .limit(1);
      if (openBorrowable.length > 0)
        throw new ApiError(
          409,
          "OUTSTANDING_RETURN",
          "Equipment borrowable masih harus dikembalikan lewat Return.",
        );
    }

    const reservationRows = await tx
      .select({
        id: reservation.id,
        unitId: reservation.equipmentUnitId,
        assetId: reservation.equipmentAssetId,
      })
      .from(reservation)
      .where(
        and(
          eq(reservation.requestId, requestId),
          inArray(reservation.status, [...conflictStatuses]),
        ),
      )
      .for("update");

    // Reservations for borrowed units were closed at return, so those units are
    // found through their return transaction. Reservations still active here
    // belong to usage-only equipment and are released directly.
    const returnedRows = await tx
      .select({
        unitId: issueTransaction.equipmentUnitId,
        assetId: issueTransaction.equipmentAssetId,
      })
      .from(returnTransaction)
      .innerJoin(
        issueTransaction,
        eq(issueTransaction.id, returnTransaction.issueTransactionId),
      )
      .where(eq(issueTransaction.requestId, requestId));

    const targets = new Map<string, { unitId: string; assetId: string }>();
    for (const row of reservationRows)
      targets.set(row.unitId, { unitId: row.unitId, assetId: row.assetId });
    for (const row of returnedRows)
      if (row.unitId && row.assetId && !targets.has(row.unitId))
        targets.set(row.unitId, { unitId: row.unitId, assetId: row.assetId });

    for (const row of targets.values()) {
      const [unit] = await tx
        .select({
          status: equipmentUnit.status,
          condition: equipmentUnit.condition,
        })
        .from(equipmentUnit)
        .where(eq(equipmentUnit.id, row.unitId))
        .limit(1);
      const unitOverride = input.unitStatuses?.find((u) => u.unitId === row.unitId);
      const inspectionResult =
        unitOverride?.status ??
        input.equipmentStatus ??
        (unit?.condition === "GOOD" ? "AVAILABLE" : "MAINTENANCE");
      const nextStatus =
        unit && ["UNDER_INSPECTION", "IN_USE", "RESERVED"].includes(unit.status)
          ? inspectionResult
          : "AVAILABLE";
      await tx
        .update(equipmentUnit)
        .set({ status: nextStatus })
        .where(eq(equipmentUnit.id, row.unitId));
      if (unit?.status === "UNDER_INSPECTION") {
        await tx.insert(equipmentConditionHistory).values({
          equipmentAssetId: row.assetId,
          equipmentUnitId: row.unitId,
          condition: nextStatus === "MAINTENANCE" ? "MINOR_ISSUE" : "GOOD",
          source: "PLP_INSPECTION",
          recordedById: actorId,
          notes: input.notes || null,
        });
      }
      const remaining = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(equipmentUnit)
        .where(
          and(
            eq(equipmentUnit.equipmentAssetId, row.assetId),
            inArray(equipmentUnit.status, [
              "RESERVED",
              "IN_USE",
              "UNDER_INSPECTION",
            ]),
          ),
        );
      if ((remaining[0]?.count ?? 0) === 0) {
        const attention = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(equipmentUnit)
          .where(
            and(
              eq(equipmentUnit.equipmentAssetId, row.assetId),
              inArray(equipmentUnit.status, ["MAINTENANCE", "DAMAGED"]),
            ),
          );
        await tx
          .update(equipmentAsset)
          .set({
            status:
              (attention[0]?.count ?? 0) > 0 ? "MAINTENANCE" : "AVAILABLE",
          })
          .where(eq(equipmentAsset.id, row.assetId));
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
      .limit(200);
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
    const requestActivity = await ensureDefaultActivity(tx, userId, input.title);
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
      await tx.insert(equipmentRequestItem).values({
        requestId: created.id,
        equipmentAssetId: item.assetId,
        equipmentUnitId: item.unitId,
        startAt,
        endAt,
        purpose: detail?.purpose ?? null,
      });
    }
    for (const item of materialRows) {
      await tx.insert(materialRequestItem).values({
        requestId: created.id,
        materialId: item.materialId,
        requestedQuantity: item.quantity.toFixed(3),
        unit: item.unit,
      });
    }

    const staff = await listStaffRecipients(tx);
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
    if (!current)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
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
      .delete(equipmentRequestItem)
      .where(eq(equipmentRequestItem.requestId, requestId));
    await tx
      .delete(materialRequestItem)
      .where(eq(materialRequestItem.requestId, requestId));
    for (const item of equipmentRows) {
      const detail = input.equipment.find(
        (entry) => entry.unitCode === item.unitCode,
      );
      await tx.insert(equipmentRequestItem).values({
        requestId,
        equipmentAssetId: item.assetId,
        equipmentUnitId: item.unitId,
        startAt,
        endAt,
        purpose: detail?.purpose ?? null,
      });
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
      const staff = await listStaffRecipients(tx);
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
    if (!current)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (
      !["PENDING_PLP", "REQUEST_REVISION", "APPROVED", "READY_FOR_PICKUP"].includes(
        current.status,
      )
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
          after: stockTransaction.afterQuantity,
        })
        .from(stockTransaction)
        .where(
          and(
            eq(stockTransaction.referenceType, "resource_request"),
            eq(stockTransaction.referenceId, requestId),
            eq(stockTransaction.type, "RESERVE"),
          ),
        );
      for (const row of reservedRows) {
        await recordStockTransaction(tx, {
          batchId: row.batchId,
          type: "RELEASE",
          quantity: Number(row.quantity),
          before: Number(row.after),
          after: Math.max(0, Number(row.after) - Number(row.quantity)),
          referenceType: "resource_request",
          referenceId: requestId,
          performedById: userId,
          reason: `Request ${current.code} dibatalkan`,
        });
      }
      await tx
        .update(materialRequestItem)
        .set({ allocatedBatchId: null })
        .where(eq(materialRequestItem.requestId, requestId));
    }

    const reservationRows = await tx
      .select({ id: reservation.id, unitId: reservation.equipmentUnitId })
      .from(reservation)
      .where(eq(reservation.requestId, requestId));
    for (const row of reservationRows) {
      await tx
        .update(reservation)
        .set({ status: "CANCELLED" })
        .where(eq(reservation.id, row.id));
      const [other] = await tx
        .select({ id: reservation.id })
        .from(reservation)
        .where(
          and(
            eq(reservation.equipmentUnitId, row.unitId),
            inArray(reservation.status, [...conflictStatuses]),
            ne(reservation.id, row.id),
          ),
        )
        .limit(1);
      if (!other) {
        await tx
          .update(equipmentUnit)
          .set({ status: "AVAILABLE" })
          .where(
            and(
              eq(equipmentUnit.id, row.unitId),
              eq(equipmentUnit.status, "RESERVED"),
            ),
          );
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
            : { status: "REQUEST_REVISION", revisionNote: note || "Perlu revisi." },
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

    const equipmentItems = await tx
      .select({
        itemId: equipmentRequestItem.id,
        unitId: equipmentRequestItem.equipmentUnitId,
        assetId: equipmentRequestItem.equipmentAssetId,
        unitCode: equipmentUnit.code,
        unitStatus: equipmentUnit.status,
        startAt: equipmentRequestItem.startAt,
        endAt: equipmentRequestItem.endAt,
        purpose: equipmentRequestItem.purpose,
      })
      .from(equipmentRequestItem)
      .innerJoin(
        equipmentUnit,
        eq(equipmentUnit.id, equipmentRequestItem.equipmentUnitId),
      )
      .where(eq(equipmentRequestItem.requestId, requestId))
      .for("update");
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
      await tx.insert(reservation).values({
        equipmentAssetId: item.assetId,
        equipmentUnitId: item.unitId,
        requestId,
        primaryUserId: current.studentId,
        startAt: item.startAt,
        endAt: item.endAt,
        status: "RESERVED",
        purpose: item.purpose,
      });
      await tx
        .update(equipmentUnit)
        .set({ status: "RESERVED" })
        .where(eq(equipmentUnit.id, item.unitId));
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
    if (!request)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (!["APPROVED", "READY_FOR_PICKUP", "OVERDUE"].includes(request.status))
      throw new ApiError(409, "INVALID_STATE", "Request belum siap di-issue.");

    const reservationRows = await tx
      .select({
        id: reservation.id,
        unitId: reservation.equipmentUnitId,
        assetId: reservation.equipmentAssetId,
        condition: equipmentAsset.condition,
      })
      .from(reservation)
      .innerJoin(
        equipmentAsset,
        eq(equipmentAsset.id, reservation.equipmentAssetId),
      )
      .where(
        and(
          eq(reservation.requestId, requestId),
          eq(reservation.status, "RESERVED"),
        ),
      )
      .for("update");
    for (const item of reservationRows) {
      await tx.insert(issueTransaction).values({
        requestId,
        equipmentAssetId: item.assetId,
        equipmentUnitId: item.unitId,
        issuedToId: request.studentId,
        issuedById: actorId,
        conditionAtIssue: item.condition,
      });
      await tx
        .update(reservation)
        .set({ status: "ACTIVE" })
        .where(eq(reservation.id, item.id));
      await tx
        .update(equipmentUnit)
        .set({ status: "IN_USE" })
        .where(eq(equipmentUnit.id, item.unitId));
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
    if (!request)
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "ACTIVE" && request.status !== "OVERDUE")
      throw new ApiError(409, "INVALID_STATE", "Request belum aktif.");

    const issues = await tx
      .select({
        id: issueTransaction.id,
        assetId: issueTransaction.equipmentAssetId,
        unitId: issueTransaction.equipmentUnitId,
        issuedToId: issueTransaction.issuedToId,
      })
      .from(issueTransaction)
      .innerJoin(
        equipmentAsset,
        eq(equipmentAsset.id, issueTransaction.equipmentAssetId),
      )
      .innerJoin(
        equipmentType,
        eq(equipmentType.id, equipmentAsset.equipmentTypeId),
      )
      .leftJoin(
        returnTransaction,
        eq(returnTransaction.issueTransactionId, issueTransaction.id),
      )
      .where(
        and(
          eq(issueTransaction.requestId, requestId),
          isNotNull(issueTransaction.equipmentAssetId),
          isNull(returnTransaction.id),
          eq(equipmentType.usageType, "BORROWABLE"),
        ),
      );
    if (issues.length === 0)
      throw new ApiError(
        409,
        "NOTHING_TO_RETURN",
        "Tidak ada equipment borrowable yang masih dipinjam. Gunakan Selesaikan penggunaan untuk equipment usage-only.",
      );
    for (const issue of issues) {
      if (!issue.assetId) continue;
      await tx.insert(returnTransaction).values({
        issueTransactionId: issue.id,
        equipmentAssetId: issue.assetId,
        returnedById: issue.issuedToId,
        receivedById: actorId,
        conditionAtReturn: input.condition,
        notes: input.notes || null,
      });
      await tx
        .update(equipmentAsset)
        .set({ condition: input.condition })
        .where(eq(equipmentAsset.id, issue.assetId));
      if (issue.unitId) {
        await tx
          .update(equipmentUnit)
          .set({ status: "UNDER_INSPECTION", condition: input.condition })
          .where(eq(equipmentUnit.id, issue.unitId));
      }
      await tx.insert(equipmentConditionHistory).values({
        equipmentAssetId: issue.assetId,
        equipmentUnitId: issue.unitId ?? null,
        condition: input.condition,
        source: "RETURN",
        recordedById: actorId,
        notes: input.notes || null,
      });
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
            inArray(reservation.equipmentUnitId, returnedUnitIds),
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
  const conditions = [];
  if (options.primaryUserId)
    conditions.push(eq(reservation.primaryUserId, options.primaryUserId));
  if (options.roomCode) conditions.push(eq(room.code, options.roomCode));
  if (options.roomCodes !== undefined)
    conditions.push(
      options.roomCodes === null
        ? sql`true`
        : options.roomCodes.length === 0
          ? sql`false`
          : inArray(room.code, options.roomCodes),
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
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      assetImageMediaId: equipmentAsset.imageMediaId,
      typeImageMediaId: equipmentType.imageMediaId,
      roomCode: room.code,
      roomName: room.name,
    })
    .from(reservation)
    .innerJoin(user, eq(user.id, reservation.primaryUserId))
    .innerJoin(resourceRequest, eq(resourceRequest.id, reservation.requestId))
    .innerJoin(equipmentUnit, eq(equipmentUnit.id, reservation.equipmentUnitId))
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, reservation.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(reservation.startAt))
    .limit(500);
  const viewerId = options.viewerId;
  return rows.map<ReservationDto>((row) => ({
    id: row.id,
    kind: "reservation",
    unitCode: row.unitCode,
    unitLabel: row.unitLabel,
    assetCode: row.assetCode,
    assetName: row.assetName,
    roomCode: row.roomCode,
    roomName: row.roomName,
    requestId: row.requestId,
    requestCode: row.requestCode,
    requestTitle: row.requestTitle,
    primaryUserId: row.primaryUserId,
    primaryUserName: row.primaryUserName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    purpose: row.purpose ?? row.requestTitle,
    mine: viewerId ? row.primaryUserId === viewerId : true,
    imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
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
