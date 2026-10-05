import "server-only";
import type {
  IncidentDto,
} from "@/services/incidents.service";
import type { RequestDto, ReservationDto } from "@/services/requests.service";
import type { SharedUsageRequestDto } from "@/services/shared-usage.service";
import type {
  IncidentView,
  NotificationView,
  RequestStatus,
  ScheduleEvent,
  SharedUsageView,
} from "@/components/schedule-data";

type Month = { year: number; month: number };

function jakartaParts(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const pick = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month") - 1,
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
  };
}

function daysInMonth(month: Month) {
  return new Date(month.year, month.month + 1, 0).getDate();
}

function clock(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function clampDay(day: number, month: Month) {
  return Math.min(Math.max(1, day), daysInMonth(month));
}

function requestTimeRange(request: RequestDto) {
  const start = jakartaParts(request.startAt);
  const end = jakartaParts(request.endAt);
  return `${clock(start.hour, start.minute)}–${clock(end.hour, end.minute)}`;
}

const UNAPPROVED_REQUEST_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "PENDING_PLP",
  "REQUEST_REVISION",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
]);

export function requestToScheduleEvent(
  request: RequestDto,
  month: Month,
  viewerId: string,
): ScheduleEvent | null {
  // Aturan Privasi & Integritas: Request yang belum disetujui (review, revisi, ditolak, dll)
  // TIDAK BOLEH muncul sebagai event bar di jadwal publik/ruangan.
  // Hanya boleh tampil di My Schedule milik mahasiswa pemohon.
  if (UNAPPROVED_REQUEST_STATUSES.has(request.status) && request.actorId !== viewerId) {
    return null;
  }

  const start = jakartaParts(request.startAt);
  if (start.year !== month.year || start.month !== month.month) return null;
  const end = jakartaParts(request.endAt);
  const endDay =
    end.year > start.year || end.month > start.month
      ? daysInMonth(month)
      : clampDay(end.day, month);
  const primaryEquipment = request.equipment[0];
  return {
    id: `request-${request.id}`,
    requestId: request.id,
    requestCode: request.code,
    title: request.title,
    startAt: request.startAt,
    endAt: request.endAt,
    startDay: clampDay(start.day, month),
    endDay,
    time: requestTimeRange(request),
    roomId: request.roomCode,
    roomName: request.roomName,
    actor: request.actorName,
    actorId: request.actorId,
    mine: request.actorId === viewerId,
    purpose: request.purpose,
    status: requestStatusView(request.status),
    kind: "request",
    mode: "borrow",
    supervisor: request.supervisor,
    fieldPic: request.fieldPic,
    revisionNote: request.revisionNote ?? undefined,
    rejectionReason: request.rejectionReason ?? undefined,
    issuedAt: request.issuedAt,
    returnedAt: request.returnedAt,
    resourceId: primaryEquipment?.assetCode,
    resourceUnit: primaryEquipment?.unitCode,
    imageMediaId:
      primaryEquipment?.imageMediaId ??
      request.materials[0]?.imageMediaId ??
      null,
    equipment: request.equipment.map((item) => ({
      id: item.assetCode,
      name: item.assetName,
      unitId: item.unitCode,
      unitLabel: item.unitLabel,
      classification: item.classification,
      imageMediaId: item.imageMediaId,
    })),
    materials: request.materials.map((item) => ({
      id: item.code,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      imageMediaId: item.imageMediaId,
    })),
  };
}

const reservationStatusMap: Record<ReservationDto["status"], RequestStatus> = {
  RESERVED: "APPROVED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "CANCELLED",
};

function requestStatusView(
  status: RequestDto["status"],
): RequestStatus {
  switch (status) {
    case "DRAFT":
    case "SUBMITTED":
      return "PENDING_PLP";
    case "EXPIRED":
      return "CANCELLED";
    default:
      return status;
  }
}

export function reservationToScheduleEvent(
  reservation: ReservationDto,
  month: Month,
): ScheduleEvent | null {
  const start = jakartaParts(reservation.startAt);
  if (start.year !== month.year || start.month !== month.month) return null;
  const end = jakartaParts(reservation.endAt);
  const endDay =
    end.year > start.year || end.month > start.month
      ? daysInMonth(month)
      : clampDay(end.day, month);
  return {
    id: `${reservation.kind}-${reservation.id}`,
    reservationId: reservation.kind === "reservation" ? reservation.id : undefined,
    requestId: reservation.requestId,
    requestCode: reservation.requestCode,
    title:
      reservation.kind === "shared"
        ? `${reservation.assetName} · ${reservation.unitCode}`
        : reservation.requestTitle,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    startDay: clampDay(start.day, month),
    endDay,
    time: `${clock(start.hour, start.minute)}–${clock(end.hour, end.minute)}`,
    roomId: reservation.roomCode,
    roomName: reservation.roomName,
    actor: reservation.primaryUserName,
    mine: reservation.mine,
    purpose: reservation.purpose,
    status:
      reservation.kind === "shared"
        ? "CONFIRMED"
        : reservationStatusMap[reservation.status],
    kind: reservation.kind === "shared" ? "shared" : "reservation",
    mode: reservation.kind === "shared" ? "shared" : "borrow",
    resourceId: reservation.assetCode,
    resourceUnit: reservation.unitCode,
    imageMediaId: reservation.imageMediaId,
    equipment: [
      {
        id: reservation.assetCode,
        name: reservation.assetName,
        unitId: reservation.unitCode,
        unitLabel: reservation.unitLabel,
        imageMediaId: reservation.imageMediaId,
      },
    ],
  };
}

// Months a calendar may navigate through. Supplying a window of months keeps
// previous/next month useful without a client round trip per navigation.
export function scheduleMonths(center: Month, before = 3, after = 12): Month[] {
  const months: Month[] = [];
  for (let offset = -before; offset <= after; offset += 1) {
    const value = new Date(center.year, center.month + offset, 1);
    months.push({ year: value.getFullYear(), month: value.getMonth() });
  }
  return months;
}

export function buildCalendarEvents(input: {
  requests?: RequestDto[];
  reservations?: ReservationDto[];
  shared?: ReservationDto[];
  month: Month;
  months?: Month[];
  viewerId: string;
}): ScheduleEvent[] {
  const months = input.months ?? [input.month];
  // One event per record: the first month in the window that contains its start
  // date wins, so multi-month requests do not render twice.
  const events = new Map<string, ScheduleEvent>();
  const requestIds = new Set((input.requests ?? []).map((r) => r.id));
  for (const month of months) {
    for (const request of input.requests ?? []) {
      const event = requestToScheduleEvent(request, month, input.viewerId);
      if (event && !events.has(event.id)) events.set(event.id, event);
    }
    for (const reservation of input.reservations ?? []) {
      if (
        reservation.kind !== "shared" &&
        reservation.requestId &&
        requestIds.has(reservation.requestId)
      ) {
        continue;
      }
      const event = reservationToScheduleEvent(reservation, month);
      if (event && !events.has(event.id)) events.set(event.id, event);
    }
    for (const usage of input.shared ?? []) {
      const event = reservationToScheduleEvent(usage, month);
      if (event && !events.has(event.id)) events.set(event.id, event);
    }
  }
  return [...events.values()];
}

export function incidentToView(incident: IncidentDto): IncidentView {
  return {
    id: incident.id,
    code: incident.code,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    occurredAt: incident.occurredAt,
    createdAt: incident.createdAt,
    reporterName: incident.reporterName,
    equipmentCode: incident.equipmentCode,
    equipmentName: incident.equipmentName,
    roomCode: incident.roomCode,
    roomName: incident.roomName,
    requestCode: incident.requestCode,
    assessment: incident.assessment,
    resolution: incident.resolution,
  };
}

export function notificationToView(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    referenceType: notification.referenceType,
    referenceId: notification.referenceId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function sharedUsageToView(
  request: SharedUsageRequestDto,
): SharedUsageView {
  return { ...request };
}
