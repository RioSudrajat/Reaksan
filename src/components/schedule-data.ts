import type { CSSProperties } from "react";

export type ScheduleTone = "blue" | "green" | "yellow" | "rose" | "cream";

export type EquipmentUnitStatus =
  | "Available"
  | "Reserved"
  | "In use"
  | "Awaiting return"
  | "Maintenance";

export type RequestStatus =
  | "PENDING_PLP"
  | "REQUEST_REVISION"
  | "APPROVED"
  | "REJECTED"
  | "READY_FOR_PICKUP"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE"
  | "CONFIRMED";

export type RequestEquipmentItem = {
  id: string;
  name: string;
  unitId: string;
  unitLabel: string;
  classification?: "INSTRUMENT" | "TOOL";
  imageMediaId?: string | null;
};

export type RequestMaterialItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  imageMediaId?: string | null;
};

// One calendar entry. Requests, reservations, and confirmed shared usage all
// use this shape so the calendar renders one consistent timeline.
export type ScheduleEvent = {
  id: string;
  requestId?: string;
  requestCode?: string;
  reservationId?: string;
  title: string;
  startAt: string;
  endAt: string;
  startDay: number;
  endDay: number;
  time: string;
  roomId: string;
  roomName: string;
  actor: string;
  actorId?: string;
  mine: boolean;
  purpose: string;
  status: RequestStatus;
  kind: "request" | "reservation" | "shared";
  mode: "borrow" | "shared";
  supervisor?: string;
  fieldPic?: string;
  revisionNote?: string;
  rejectionReason?: string;
  issuedAt?: string | null;
  returnedAt?: string | null;
  resourceId?: string;
  resourceUnit?: string;
  // Catalog artwork for the primary resource, used by calendar bars and lists.
  imageMediaId?: string | null;
  equipment?: RequestEquipmentItem[];
  materials?: RequestMaterialItem[];
};

export type ScheduleRequestDraft = {
  title: string;
  mode: "borrow" | "shared";
  startDay: number;
  endDay: number;
  startTime: string;
  endTime: string;
  roomId: string;
  equipment: RequestEquipmentItem[];
  materials: RequestMaterialItem[];
  purpose: string;
  supervisor: string;
  fieldPic: string;
};

export type RoomView = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  tone: ScheduleTone;
  position: CSSProperties;
  equipment: number;
  available: number;
  reserved: number;
  inUse: number;
  awaitingReturn: number;
  maintenance: number;
  typeCount: number;
};

export type EquipmentUnitView = {
  id: string;
  label: string;
  status: EquipmentUnitStatus;
  holder?: string;
  condition?: string;
  notes?: string | null;
};

export type EquipmentView = {
  id: string;
  name: string;
  typeName: string;
  classification: "INSTRUMENT" | "TOOL";
  roomId: string;
  room: string;
  usage: string;
  condition: string;
  meta: string;
  nextAvailable: string;
  status: EquipmentUnitStatus;
  tone: ScheduleTone;
  imageMediaId: string | null;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  inUseUnits: number;
  awaitingReturnUnits: number;
  maintenanceUnits: number;
  units: EquipmentUnitView[];
};

export type MaterialView = {
  id: string;
  name: string;
  category: string;
  roomId: string;
  room: string;
  unit: string;
  options: number[];
  physical: number;
  reserved: number;
  available: number;
  rule: string;
  tone: ScheduleTone;
  expiry: string | null;
  imageMediaId: string | null;
};

export type LabCatalog = {
  rooms: RoomView[];
  equipment: EquipmentView[];
  materials: MaterialView[];
};

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus =
  | "REPORTED"
  | "UNDER_ASSESSMENT"
  | "IN_MAINTENANCE"
  | "RESOLVED";

export type IncidentView = {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string | null;
  createdAt: string;
  reporterName: string;
  equipmentCode: string | null;
  equipmentName: string | null;
  roomCode: string | null;
  roomName: string | null;
  requestCode: string | null;
  assessment: {
    finding: string;
    assessment: string;
    recommendedAction: string | null;
    createdAt: string;
    assessedByName: string;
  } | null;
  resolution: {
    action: string;
    notes: string | null;
    resolvedAt: string;
    resolvedByName: string;
  } | null;
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SharedUsageView = {
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

export type SharedUsagePageView = {
  available: Array<
    ReservationView & {
      myRequestId: string | null;
      myRequestStatus: SharedUsageView["status"] | null;
    }
  >;
  incoming: SharedUsageView[];
  outgoing: SharedUsageView[];
};

export type ReservationView = {
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

export type MaterialOptionSummary = {
  physical: number;
  reserved: number;
  available: number;
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function monthName(month: number) {
  return monthNames[month] ?? "";
}

export function formatRangeLabel(
  range: { start: number; end: number },
  month: { year: number; month: number },
) {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  if (start === end) return `${start} ${monthNames[month.month]} ${month.year}`;
  return `${start}–${end} ${monthNames[month.month]} ${month.year}`;
}

export function formatShortRangeLabel(range: { start: number; end: number }) {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  const month = shortMonthNames[new Date().getMonth()];
  if (start === end) return `${start} ${month}`;
  return `${start}–${end} ${month}`;
}

export function currentScheduleMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function scheduleToday() {
  return new Date().getDate();
}

export function eventDisplayState(event: ScheduleEvent): RequestStatus {
  return event.status;
}

export function parseJakartaDate(isoString: string): Date {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(d);
  const pick = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(pick("year"), pick("month") - 1, pick("day"));
}

export function eventsForRange(
  events: ScheduleEvent[],
  range: { start: number; end: number },
  month?: { year: number; month: number },
) {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);

  if (month) {
    const rangeStart = new Date(month.year, month.month, start, 0, 0, 0, 0);
    const rangeEnd = new Date(month.year, month.month, end, 23, 59, 59, 999);
    return events
      .filter((event) => {
        let s: Date;
        let e: Date;
        if (event.startAt) {
          try {
            s = parseJakartaDate(event.startAt);
          } catch {
            s = new Date(month.year, month.month, Math.min(event.startDay, event.endDay));
          }
        } else {
          s = new Date(month.year, month.month, Math.min(event.startDay, event.endDay));
        }

        if (event.endAt) {
          try {
            e = parseJakartaDate(event.endAt);
          } catch {
            e = new Date(month.year, month.month, Math.max(event.startDay, event.endDay));
          }
        } else {
          e = new Date(month.year, month.month, Math.max(event.startDay, event.endDay));
        }

        const sMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
        const eMidnight = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        return sMidnight <= rangeEnd && eMidnight >= rangeStart;
      })
      .sort((a, b) => {
        const aTime = a.startAt ? new Date(a.startAt).getTime() : a.startDay;
        const bTime = b.startAt ? new Date(b.startAt).getTime() : b.startDay;
        return aTime - bTime;
      });
  }

  return events
    .filter((event) => {
      const eventStart = Math.min(event.startDay, event.endDay);
      const eventEnd = Math.max(event.startDay, event.endDay);
      return eventStart <= end && eventEnd >= start;
    })
    .sort((a, b) => a.startDay - b.startDay);
}

export function splitEventTime(time: string) {
  const match = time.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
  if (!match) return { startTime: "08:00", endTime: "12:00" };
  return { startTime: match[1], endTime: match[2] };
}

export function isOwnEvent(event: ScheduleEvent) {
  return event.mine;
}

export function equipmentBreakdown(summary: {
  availableUnits: number;
  reservedUnits: number;
  inUseUnits: number;
  awaitingReturnUnits: number;
  maintenanceUnits: number;
}) {
  return [
    `${summary.availableUnits} siap pakai`,
    summary.reservedUnits > 0 ? `${summary.reservedUnits} direservasi` : null,
    summary.inUseUnits > 0 ? `${summary.inUseUnits} digunakan` : null,
    summary.awaitingReturnUnits > 0
      ? `${summary.awaitingReturnUnits} menunggu kembali`
      : null,
    summary.maintenanceUnits > 0
      ? `${summary.maintenanceUnits} perbaikan`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function requestStatusTone(status: RequestStatus): ScheduleTone {
  switch (status) {
    case "PENDING_PLP":
      return "blue";
    case "REQUEST_REVISION":
    case "READY_FOR_PICKUP":
    case "ACTIVE":
      return "yellow";
    case "APPROVED":
    case "CONFIRMED":
      return "green";
    case "REJECTED":
    case "OVERDUE":
      return "rose";
    default:
      return "cream";
  }
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING_PLP: "Menunggu PLP",
  REQUEST_REVISION: "Perlu revisi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  READY_FOR_PICKUP: "Siap diambil",
  ACTIVE: "Sedang digunakan",
  RETURNED: "Dikembalikan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  OVERDUE: "Lewat tenggat",
  CONFIRMED: "Sesi Bersama",
};

// Calendar legend order. Shared usage is shown as confirmed extra usage.
export const displayOrder: RequestStatus[] = [
  "PENDING_PLP",
  "REQUEST_REVISION",
  "APPROVED",
  "READY_FOR_PICKUP",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "REJECTED",
  "OVERDUE",
  "CANCELLED",
  "CONFIRMED",
];

export const displayLabels: Record<RequestStatus, string> = {
  PENDING_PLP: "Menunggu PLP",
  REQUEST_REVISION: "Perlu revisi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  READY_FOR_PICKUP: "Siap diambil",
  ACTIVE: "Sedang digunakan",
  RETURNED: "Dikembalikan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  OVERDUE: "Lewat tenggat",
  CONFIRMED: "Sesi Bersama",
};

export const displayDotClasses: Record<RequestStatus, string> = {
  PENDING_PLP: "bg-[#6E8EDA]",
  REQUEST_REVISION: "bg-[#F7B742]",
  APPROVED: "bg-[#048444]",
  READY_FOR_PICKUP: "bg-[#AE7C1D]",
  ACTIVE: "bg-[#F9B129]",
  RETURNED: "bg-[#929292]",
  COMPLETED: "bg-[#929292]",
  REJECTED: "bg-[#F45959]",
  OVERDUE: "bg-[#F45959]",
  CANCELLED: "bg-[#B7B7B7]",
  CONFIRMED: "bg-[#03683A]",
};

export const displayBarClasses: Record<RequestStatus, string> = {
  PENDING_PLP: "border-[#38529B] bg-[#6E8EDA] text-white",
  REQUEST_REVISION: "border-[#C88C1A] bg-[#F7B742] text-[#212121]",
  APPROVED: "border-[#03683A] bg-[#048444] text-white",
  READY_FOR_PICKUP: "border-[#8A6317] bg-[#F9B129] text-[#212121]",
  ACTIVE: "border-[#C88C1A] bg-[#F9B129] text-[#212121]",
  RETURNED: "border-[#B7B7B7] bg-[#E1E1E1] text-[#212121]",
  COMPLETED: "border-[#C9C9C9] bg-[#EEEEEE] text-[#5D5B53]",
  REJECTED: "border-[#9E3636] bg-[#F45959] text-white",
  OVERDUE: "border-[#9E3636] bg-[#F45959] text-white",
  CANCELLED: "border-[#B7B7B7] bg-[#EEEEEE] text-[#6B6B6B]",
  CONFIRMED: "border-[#03683A] bg-[#048444] text-white",
};

export const displayBadgeClasses: Record<RequestStatus, string> = {
  PENDING_PLP: "bg-[#E9EEFC] text-[#38529B]",
  REQUEST_REVISION: "bg-[#FFF4D9] text-[#705012]",
  APPROVED: "bg-[#E5F5ED] text-[#03683A]",
  READY_FOR_PICKUP: "bg-[#FEF1CC] text-[#705012]",
  ACTIVE: "bg-[#FEF1CC] text-[#705012]",
  RETURNED: "bg-[#F1F0EC] text-[#5D5B53]",
  COMPLETED: "bg-[#F1F0EC] text-[#5D5B53]",
  REJECTED: "bg-[#FDE9E9] text-[#9E3636]",
  OVERDUE: "bg-[#FDE9E9] text-[#9E3636]",
  CANCELLED: "bg-[#F1F0EC] text-[#6B6B6B]",
  CONFIRMED: "bg-[#E5F5ED] text-[#03683A]",
};
