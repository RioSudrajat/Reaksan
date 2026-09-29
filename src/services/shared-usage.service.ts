import "server-only";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  equipmentAsset,
  equipmentType,
  equipmentUnit,
  reservation,
  resourceRequest,
  room,
  sharedUsage,
  sharedUsageRequest,
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { writeAudit } from "@/services/audit.service";
import { createNotification } from "@/services/notifications.service";
import type { ReservationDto } from "@/services/requests.service";
import type { CreateSharedUsageInput } from "@/validators/shared-usage";

export type SharedUsageRequestDto = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  reservationId: string;
  requesterId: string;
  requesterName: string;
  primaryUserId: string;
  primaryUserName: string;
  unitCode: string;
  unitLabel: string;
  assetCode: string;
  assetName: string;
  roomCode: string;
  roomName: string;
  reservationStartAt: string;
  reservationEndAt: string;
  startAt: string;
  endAt: string;
  purpose: string;
  createdAt: string;
  respondedAt: string | null;
  imageMediaId: string | null;
};

export type AvailableReservationDto = ReservationDto & {
  myRequestId: string | null;
  myRequestStatus: SharedUsageRequestDto["status"] | null;
};

export type SharedUsagePageData = {
  available: AvailableReservationDto[];
  incoming: SharedUsageRequestDto[];
  outgoing: SharedUsageRequestDto[];
};

const sharedSelection = {
  id: sharedUsageRequest.id,
  status: sharedUsageRequest.status,
  requesterId: sharedUsageRequest.requesterId,
  requesterName: user.name,
  primaryUserId: reservation.primaryUserId,
  reservationId: reservation.id,
  reservationStartAt: reservation.startAt,
  reservationEndAt: reservation.endAt,
  startAt: sharedUsageRequest.requestedStartAt,
  endAt: sharedUsageRequest.requestedEndAt,
  purpose: sharedUsageRequest.purpose,
  createdAt: sharedUsageRequest.createdAt,
  respondedAt: sharedUsageRequest.respondedAt,
  unitCode: equipmentUnit.code,
  unitLabel: equipmentUnit.label,
  assetCode: equipmentAsset.assetCode,
  assetName: equipmentType.name,
  assetImageMediaId: equipmentAsset.imageMediaId,
  typeImageMediaId: equipmentType.imageMediaId,
  roomCode: room.code,
  roomName: room.name,
};

type SharedRow = {
  id: string;
  status: SharedUsageRequestDto["status"];
  requesterId: string;
  requesterName: string;
  primaryUserId: string;
  reservationId: string;
  reservationStartAt: Date;
  reservationEndAt: Date;
  startAt: Date;
  endAt: Date;
  purpose: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  unitCode: string;
  unitLabel: string;
  assetCode: string;
  assetName: string;
  assetImageMediaId: string | null;
  typeImageMediaId: string | null;
  roomCode: string;
  roomName: string;
};

function toDto(row: SharedRow, primaryUserName: string): SharedUsageRequestDto {
  return {
    id: row.id,
    status: row.status,
    reservationId: row.reservationId,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    primaryUserId: row.primaryUserId,
    primaryUserName,
    unitCode: row.unitCode,
    unitLabel: row.unitLabel,
    assetCode: row.assetCode,
    assetName: row.assetName,
    roomCode: row.roomCode,
    roomName: row.roomName,
    reservationStartAt: row.reservationStartAt.toISOString(),
    reservationEndAt: row.reservationEndAt.toISOString(),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    purpose: row.purpose ?? "",
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
  };
}

async function loadSharedRows(
  exec: DbExecutor,
  options: {
    requesterId?: string;
    primaryUserId?: string;
    reservationId?: string;
    statuses?: SharedUsageRequestDto["status"][];
    limit?: number;
  },
) {
  const conditions = [];
  if (options.requesterId)
    conditions.push(eq(sharedUsageRequest.requesterId, options.requesterId));
  if (options.primaryUserId)
    conditions.push(eq(reservation.primaryUserId, options.primaryUserId));
  if (options.reservationId)
    conditions.push(eq(sharedUsageRequest.reservationId, options.reservationId));
  if (options.statuses)
    conditions.push(inArray(sharedUsageRequest.status, options.statuses));
  const rows = await exec
    .select(sharedSelection)
    .from(sharedUsageRequest)
    .innerJoin(reservation, eq(reservation.id, sharedUsageRequest.reservationId))
    .innerJoin(user, eq(user.id, sharedUsageRequest.requesterId))
    .innerJoin(
      resourceRequest,
      eq(resourceRequest.id, reservation.requestId),
    )
    .innerJoin(equipmentUnit, eq(equipmentUnit.id, reservation.equipmentUnitId))
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, reservation.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sharedUsageRequest.createdAt))
    .limit(options.limit ?? 200);
  return rows as SharedRow[];
}

async function primaryNames(exec: DbExecutor, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const rows = await exec
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, userIds));
  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function listSharedUsageRequests(
  exec: DbExecutor,
  options: Parameters<typeof loadSharedRows>[1],
) {
  const rows = await loadSharedRows(exec, options);
  const names = await primaryNames(
    exec,
    [...new Set(rows.map((row) => row.primaryUserId))],
  );
  return rows.map((row) => toDto(row, names.get(row.primaryUserId) ?? "Primary user"));
}

export async function loadSharedUsagePage(
  userId: string,
): Promise<SharedUsagePageData> {
  const now = new Date();
  const reservationRows = await db
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
    .where(
      and(
        ne(reservation.primaryUserId, userId),
        inArray(reservation.status, ["RESERVED", "ACTIVE"]),
        gt(reservation.endAt, now),
      ),
    )
    .orderBy(asc(reservation.startAt))
    .limit(100);

  const myRequests = await listSharedUsageRequests(db, { requesterId: userId });
  // One reservation can have several requests over time. Show the most
  // actionable status instead of relying on row order.
  const statusRank: Record<SharedUsageRequestDto["status"], number> = {
    PENDING: 5,
    ACCEPTED: 4,
    DECLINED: 3,
    CANCELLED: 2,
    EXPIRED: 1,
  };
  const myRequestsByReservation = new Map<string, SharedUsageRequestDto>();
  for (const item of myRequests) {
    const current = myRequestsByReservation.get(item.reservationId);
    if (!current || statusRank[item.status] > statusRank[current.status]) {
      myRequestsByReservation.set(item.reservationId, item);
    }
  }
  const incoming = await listSharedUsageRequests(db, {
    primaryUserId: userId,
    statuses: ["PENDING"],
  });
  const outgoing = myRequests;

  const available: AvailableReservationDto[] = reservationRows.map((row) => {
    const mine = myRequestsByReservation.get(row.id);
    return {
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
      mine: false,
      imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
      myRequestId: mine?.id ?? null,
      myRequestStatus: mine?.status ?? null,
    };
  });

  return { available, incoming, outgoing };
}

export async function createSharedUsageRequest(
  userId: string,
  input: CreateSharedUsageInput,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        reservationId: reservation.id,
        status: reservation.status,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        primaryUserId: reservation.primaryUserId,
        unitId: reservation.equipmentUnitId,
        unitCode: equipmentUnit.code,
        requestCode: resourceRequest.code,
        primaryName: user.name,
      })
      .from(reservation)
      .innerJoin(
        equipmentUnit,
        eq(equipmentUnit.id, reservation.equipmentUnitId),
      )
      .innerJoin(resourceRequest, eq(resourceRequest.id, reservation.requestId))
      .innerJoin(user, eq(user.id, reservation.primaryUserId))
      .where(eq(reservation.id, input.reservationId))
      .limit(1)
      .for("update");
    if (!row)
      throw new ApiError(404, "NOT_FOUND", "Reservation not found.");
    if (!["RESERVED", "ACTIVE"].includes(row.status))
      throw new ApiError(
        409,
        "RESERVATION_NOT_ACTIVE",
        "Reservation ini tidak aktif lagi.",
      );
    if (row.primaryUserId === userId)
      throw new ApiError(
        422,
        "OWN_RESERVATION",
        "Kamu adalah pemilik utama reservation ini.",
      );
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (startAt < row.startAt || endAt > row.endAt)
      throw new ApiError(
        422,
        "OUTSIDE_RESERVATION",
        "Interval harus berada di dalam reservation utama.",
      );

    const overlapping = await tx
      .select({ id: sharedUsageRequest.id })
      .from(sharedUsageRequest)
      .where(
        and(
          eq(sharedUsageRequest.reservationId, row.reservationId),
          eq(sharedUsageRequest.requesterId, userId),
          inArray(sharedUsageRequest.status, ["PENDING", "ACCEPTED"]),
          sql`${sharedUsageRequest.requestedStartAt} < ${endAt}`,
          sql`${sharedUsageRequest.requestedEndAt} > ${startAt}`,
        ),
      )
      .limit(1);
    if (overlapping.length > 0)
      throw new ApiError(
        409,
        "SHARED_USAGE_OVERLAP",
        "Kamu sudah punya permintaan shared usage pada interval itu.",
      );

    const ownReservation = await tx
      .select({ id: reservation.id })
      .from(reservation)
      .where(
        and(
          eq(reservation.equipmentUnitId, row.unitId),
          eq(reservation.primaryUserId, userId),
          inArray(reservation.status, ["RESERVED", "ACTIVE"]),
          sql`${reservation.startAt} < ${endAt}`,
          sql`${reservation.endAt} > ${startAt}`,
        ),
      )
      .limit(1);
    if (ownReservation.length > 0)
      throw new ApiError(
        409,
        "RESERVATION_CONFLICT",
        "Kamu sudah punya reservation sendiri pada unit dan waktu itu.",
      );

    const [created] = await tx
      .insert(sharedUsageRequest)
      .values({
        reservationId: row.reservationId,
        requesterId: userId,
        requestedStartAt: startAt,
        requestedEndAt: endAt,
        purpose: input.purpose || null,
      })
      .returning({ id: sharedUsageRequest.id });
    const [actor] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    await createNotification(tx, {
      recipientId: row.primaryUserId,
      type: "SHARED_USAGE_REQUESTED",
      title: "Permintaan shared usage",
      message: `${actor?.name ?? "Mahasiswa"} ingin memakai ${row.unitCode} di reservation ${row.requestCode}.`,
      referenceType: "shared_usage_request",
      referenceId: created.id,
    });
    await writeAudit(tx, {
      actorId: userId,
      action: "CREATE",
      entityType: "shared_usage_request",
      entityId: created.id,
      after: { reservationId: row.reservationId, startAt, endAt },
    });
    const rows = await loadSharedRows(tx, {
      reservationId: row.reservationId,
      requesterId: userId,
    });
    const createdRow = rows.find((item) => item.id === created.id);
    return createdRow ? toDto(createdRow, row.primaryName) : null;
  });
}

export async function respondSharedUsage(
  userId: string,
  id: string,
  action: "accept" | "decline",
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: sharedUsageRequest.id,
        status: sharedUsageRequest.status,
        requesterId: sharedUsageRequest.requesterId,
        reservationId: sharedUsageRequest.reservationId,
        startAt: sharedUsageRequest.requestedStartAt,
        endAt: sharedUsageRequest.requestedEndAt,
        purpose: sharedUsageRequest.purpose,
        reservationStatus: reservation.status,
        primaryUserId: reservation.primaryUserId,
        unitCode: equipmentUnit.code,
        requestCode: resourceRequest.code,
      })
      .from(sharedUsageRequest)
      .innerJoin(reservation, eq(reservation.id, sharedUsageRequest.reservationId))
      .innerJoin(
        equipmentUnit,
        eq(equipmentUnit.id, reservation.equipmentUnitId),
      )
      .innerJoin(resourceRequest, eq(resourceRequest.id, reservation.requestId))
      .where(eq(sharedUsageRequest.id, id))
      .limit(1)
      .for("update");
    if (!row || row.primaryUserId !== userId)
      throw new ApiError(404, "NOT_FOUND", "Shared usage request not found.");
    if (row.status !== "PENDING")
      throw new ApiError(
        409,
        "INVALID_STATE",
        "Permintaan ini sudah dijawab.",
      );
    if (!["RESERVED", "ACTIVE"].includes(row.reservationStatus))
      throw new ApiError(
        409,
        "RESERVATION_NOT_ACTIVE",
        "Reservation utama tidak aktif lagi.",
      );

    if (action === "accept") {
      await tx.insert(sharedUsage).values({
        reservationId: row.reservationId,
        sharedUsageRequestId: row.id,
        userId: row.requesterId,
        startAt: row.startAt,
        endAt: row.endAt,
        purpose: row.purpose,
      });
      await tx
        .update(sharedUsageRequest)
        .set({ status: "ACCEPTED", respondedAt: new Date() })
        .where(eq(sharedUsageRequest.id, id));
    } else {
      await tx
        .update(sharedUsageRequest)
        .set({ status: "DECLINED", respondedAt: new Date() })
        .where(eq(sharedUsageRequest.id, id));
    }
    await createNotification(tx, {
      recipientId: row.requesterId,
      type:
        action === "accept"
          ? "SHARED_USAGE_ACCEPTED"
          : "SHARED_USAGE_DECLINED",
      title:
        action === "accept"
          ? "Shared usage diterima"
          : "Shared usage ditolak",
      message:
        action === "accept"
          ? `${row.unitCode} bisa kamu pakai sesuai interval yang disetujui.`
          : `Permintaan shared usage ${row.unitCode} ditolak pemilik utama.`,
      referenceType: "shared_usage_request",
      referenceId: id,
    });
    await writeAudit(tx, {
      actorId: userId,
      action: "UPDATE",
      entityType: "shared_usage_request",
      entityId: id,
      before: { status: "PENDING" },
      after: { status: action === "accept" ? "ACCEPTED" : "DECLINED" },
    });
    const nameRows = await primaryNames(tx, [userId]);
    const rows = await loadSharedRows(tx, { reservationId: row.reservationId });
    const updated = rows.find((item) => item.id === id);
    return updated ? toDto(updated, nameRows.get(userId) ?? "Primary user") : null;
  });
}

export async function cancelSharedUsage(userId: string, id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: sharedUsageRequest.id,
        status: sharedUsageRequest.status,
        requesterId: sharedUsageRequest.requesterId,
        reservationId: sharedUsageRequest.reservationId,
        primaryUserId: reservation.primaryUserId,
      })
      .from(sharedUsageRequest)
      .innerJoin(reservation, eq(reservation.id, sharedUsageRequest.reservationId))
      .where(eq(sharedUsageRequest.id, id))
      .limit(1)
      .for("update");
    if (!row || row.requesterId !== userId)
      throw new ApiError(404, "NOT_FOUND", "Shared usage request not found.");
    if (row.status !== "PENDING")
      throw new ApiError(409, "INVALID_STATE", "Permintaan ini sudah diproses.");
    await tx
      .update(sharedUsageRequest)
      .set({ status: "CANCELLED", respondedAt: new Date() })
      .where(eq(sharedUsageRequest.id, id));
    await writeAudit(tx, {
      actorId: userId,
      action: "CANCEL",
      entityType: "shared_usage_request",
      entityId: id,
      before: { status: "PENDING" },
      after: { status: "CANCELLED" },
    });
    return { id };
  });
}

export async function listConfirmedSharedUsage(userId: string) {
  return loadConfirmedSharedUsage(db, { userId, viewerId: userId });
}

export async function listRoomConfirmedSharedUsage(
  roomCode: string,
  viewerId?: string,
) {
  return loadConfirmedSharedUsage(db, { roomCode, viewerId });
}

async function loadConfirmedSharedUsage(
  exec: DbExecutor,
  options: { userId?: string; roomCode?: string; viewerId?: string },
): Promise<ReservationDto[]> {
  const conditions = [];
  if (options.userId) conditions.push(eq(sharedUsage.userId, options.userId));
  if (options.roomCode) conditions.push(eq(room.code, options.roomCode));
  const sharedUser = alias(user, "shared_user");
  const primaryUser = alias(user, "primary_user");
  const rows = await exec
    .select({
      id: sharedUsage.id,
      startAt: sharedUsage.startAt,
      endAt: sharedUsage.endAt,
      purpose: sharedUsage.purpose,
      userId: sharedUsage.userId,
      userName: sharedUser.name,
      reservationId: sharedUsage.reservationId,
      reservationPrimaryUserId: reservation.primaryUserId,
      primaryUserName: primaryUser.name,
      requestId: resourceRequest.id,
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
    .from(sharedUsage)
    .innerJoin(reservation, eq(reservation.id, sharedUsage.reservationId))
    .innerJoin(sharedUser, eq(sharedUser.id, sharedUsage.userId))
    .innerJoin(primaryUser, eq(primaryUser.id, reservation.primaryUserId))
    .innerJoin(resourceRequest, eq(resourceRequest.id, reservation.requestId))
    .innerJoin(equipmentUnit, eq(equipmentUnit.id, reservation.equipmentUnitId))
    .innerJoin(
      equipmentAsset,
      eq(equipmentAsset.id, reservation.equipmentAssetId),
    )
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(sharedUsage.startAt))
    .limit(500);
  return rows.map<ReservationDto>((row) => ({
    id: row.id,
    kind: "shared",
    unitCode: row.unitCode,
    unitLabel: row.unitLabel,
    assetCode: row.assetCode,
    assetName: row.assetName,
    roomCode: row.roomCode,
    roomName: row.roomName,
    requestId: row.requestId,
    requestCode: row.requestCode,
    requestTitle: row.requestTitle,
    primaryUserId: row.reservationPrimaryUserId,
    primaryUserName: row.primaryUserName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: "ACTIVE",
    purpose: row.purpose ?? `Shared usage ${row.requestCode}`,
    mine: options.viewerId ? row.userId === options.viewerId : false,
    imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
  }));
}

export async function listOutgoingSharedUsage(userId: string) {
  return listSharedUsageRequests(db, { requesterId: userId });
}

export async function listIncomingSharedUsage(userId: string) {
  return listSharedUsageRequests(db, {
    primaryUserId: userId,
    statuses: ["PENDING"],
  });
}
