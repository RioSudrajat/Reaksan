import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  incident,
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
  stockOpnameEntry,
  stockTransaction,
  toolAsset,
  toolConditionHistory,
  toolRequestItem,
  toolType,
  toolUnit,
  user,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { DbExecutor } from "@/services/executor";
import {
  auditRoomScopeSql,
  assertRoomInScope,
  type RoomScope,
} from "@/services/access-scope.service";
import { writeAudit } from "@/services/audit.service";
import { recordStockTransaction } from "@/services/stock.service";
import type {
  PlpEquipmentAssetInput,
  PlpEquipmentUnitInput,
  PlpMaterialBatchInput,
  PlpMaterialCreateInput,
  PlpStockAdjustInput,
} from "@/validators/plp";
import {
  countRequestRows,
  loadRequestDtos,
  loadReservations,
  type RequestDto,
  type RequestLoadFilters,
  type ReservationDto,
} from "@/services/requests.service";
import { buildCalendarEvents, scheduleMonths } from "@/services/view.service";
import type { ScheduleEvent } from "@/components/schedule-data";
import {
  dispensingRuleLabel,
  listMaterialRows,
  materialStockSummary,
  type MaterialAggregateRow,
} from "@/services/catalog.service";
import { listBatchStock } from "@/services/stock.service";
import { getAppSettings } from "@/services/settings.service";
import {
  listIncidentPage,
  type IncidentDto,
} from "@/services/incidents.service";
import { countUnreadNotifications } from "@/services/notifications.service";

const DAY_MS = 24 * 60 * 60 * 1000;

function jakartaDayRange(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * DAY_MS);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const start = new Date(`${parts}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export type PlpDashboard = {
  generatedAt: string;
  counts: {
    pending: number;
    issueDue: number;
    returnDue: number;
    lowStock: number;
    openIncidents: number;
    upcoming: number;
    maintenance: number;
  };
  pending: RequestDto[];
  issueQueue: RequestDto[];
  returnQueue: RequestDto[];
  lowStock: PlpMaterialRow[];
  incidents: IncidentDto[];
  upcoming: ReservationDto[];
  maintenanceUnits: MaintenanceUnitDto[];
  unread: number;
};

export type PlpScheduleEvent = {
  id: string;
  kind: "request" | "reservation";
  requestId: string;
  code: string;
  title: string;
  actorName: string;
  roomCode: string;
  roomName: string;
  resource: string;
  status: string;
  startAt: string;
  endAt: string;
};

export type PlpEquipmentRow = {
  assetId: string;
  assetCode: string;
  name: string;
  category: string | null;
  typeName: string;
  classification: "INSTRUMENT" | "TOOL";
  usageType: "BORROWABLE" | "USAGE_ONLY";
  roomCode: string;
  roomName: string;
  status: string;
  condition: string;
  notes: string | null;
  imageMediaId: string | null;
  unitCount: number;
  availableUnits: number;
  reservedUnits: number;
  inUseUnits: number;
  awaitingInspectionUnits: number;
  maintenanceUnits: number;
  totalRequests: number;
  activeRequests: number;
  units: Array<{
    unitId: string;
    code: string;
    label: string;
    qrCode: string | null;
    storageLocation: string | null;
    status: string;
    condition: string;
    notes: string | null;
    active: boolean;
  }>;
};

export type PlpMaterialRow = {
  materialId: string;
  code: string;
  name: string;
  category: string | null;
  baseUnit: string;
  unit: string;
  roomCode: string;
  roomName: string;
  physical: number;
  reserved: number;
  issued: number;
  totalCapacity: number;
  available: number;
  minimum: number | null;
  rule: string;
  expiry: string | null;
  imageMediaId: string | null;
  lowStock: boolean;
  outOfStock: boolean;
  hasExpired: boolean;
  hasExpiringSoon: boolean;
  totalRequests: number;
  activeRequests: number;
  totalRequestedQuantity: number;
  batches: Array<{
    batchId: string;
    lotNumber: string | null;
    qrCode: string | null;
    storageLocation: string | null;
    roomCode: string;
    roomName: string;
    quantity: number;
    reserved: number;
    issued?: number;
    totalCapacity?: number;
    expiryDate: string | null;
    active: boolean;
    expired: boolean;
  }>;
};

export type PlpHistoryEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
  afterData: unknown;
};

function requestResourceLabel(request: RequestDto) {
  const equipment = request.equipment.map((item) => item.unitCode).join(", ");
  const materials = request.materials
    .map((item) => `${item.name} ${item.quantity} ${item.unit}`)
    .join(", ");
  return [equipment, materials].filter(Boolean).join(" · ") || request.roomName;
}

export async function listPlpSchedule(input: {
  from: string;
  to: string;
  room?: string;
  roomCodes?: string[] | null;
  kind?: "all" | "request" | "reservation";
}): Promise<PlpScheduleEvent[]> {
  const from = new Date(`${input.from}T00:00:00+07:00`);
  const to = new Date(`${input.to}T23:59:59.999+07:00`);
  const requestFilters: RequestLoadFilters = {
    from,
    to,
    roomCode: input.room,
    roomCodes: input.roomCodes,
    statuses: [
      "APPROVED",
      "READY_FOR_PICKUP",
      "ACTIVE",
      "RETURNED",
      "OVERDUE",
      "COMPLETED",
    ],
    limit: 400,
  };
  const [requests, reservations] = await Promise.all([
    input.kind === "reservation"
      ? Promise.resolve<RequestDto[]>([])
      : loadRequestDtos(db, requestFilters),
    input.kind === "request"
      ? Promise.resolve<ReservationDto[]>([])
      : loadReservations(db, {
          from,
          to,
          roomCode: input.room,
          roomCodes: input.roomCodes,
          statuses: ["RESERVED", "ACTIVE"],
        }),
  ]);
  const events: PlpScheduleEvent[] = requests.map((request) => ({
    id: `request-${request.id}`,
    kind: "request",
    requestId: request.id,
    code: request.code,
    title: request.title,
    actorName: request.actorName,
    roomCode: request.roomCode,
    roomName: request.roomName,
    resource: requestResourceLabel(request),
    status: request.status,
    startAt: request.startAt,
    endAt: request.endAt,
  }));
  const requestIds = new Set(requests.map((r) => r.id));
  for (const reservation of reservations) {
    if (
      input.kind !== "reservation" &&
      reservation.requestId &&
      requestIds.has(reservation.requestId)
    ) {
      continue;
    }
    const effectiveStatus =
      reservation.requestStatus === "OVERDUE"
        ? "OVERDUE"
        : reservation.status === "ACTIVE"
          ? "ACTIVE"
          : "APPROVED";
    events.push({
      id: `reservation-${reservation.id}`,
      kind: "reservation",
      requestId: reservation.requestId,
      code: reservation.requestCode,
      title: reservation.assetName,
      actorName: reservation.primaryUserName,
      roomCode: reservation.roomCode,
      roomName: reservation.roomName,
      resource: `${reservation.assetName} · ${reservation.unitCode}`,
      status: effectiveStatus,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    });
  }
  return events.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

async function loadEquipmentRows(
  exec: DbExecutor,
  roomCode?: string,
  roomCodes?: string[] | null,
  options?: {
    assetCode?: string;
    classification?: "INSTRUMENT" | "TOOL";
  },
): Promise<PlpEquipmentRow[]> {
  const scopeCondition =
    roomCodes === undefined || roomCodes === null
      ? undefined
      : roomCodes.length === 0
        ? sql`false`
        : inArray(room.code, roomCodes);
  const wantInstruments =
    !options?.classification || options.classification === "INSTRUMENT";
  const wantTools =
    !options?.classification || options.classification === "TOOL";
  const [instrumentAssets, toolAssets] = await Promise.all([
    wantInstruments
      ? exec
          .select({
            assetId: instrumentAsset.id,
            assetCode: instrumentAsset.assetCode,
            name: instrumentType.name,
            category: instrumentType.category,
            typeName: instrumentType.name,
            classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
            usageType: instrumentType.usageType,
            status: instrumentAsset.status,
            condition: instrumentAsset.condition,
            notes: instrumentAsset.notes,
            assetImageMediaId: instrumentAsset.imageMediaId,
            typeImageMediaId: instrumentType.imageMediaId,
            roomCode: room.code,
            roomName: room.name,
          })
          .from(instrumentAsset)
          .innerJoin(
            instrumentType,
            eq(instrumentType.id, instrumentAsset.instrumentTypeId),
          )
          .innerJoin(room, eq(room.id, instrumentAsset.roomId))
          .where(
            and(
              eq(instrumentAsset.active, true),
              options?.assetCode
                ? eq(instrumentAsset.assetCode, options.assetCode)
                : undefined,
              roomCode ? eq(room.code, roomCode) : undefined,
              scopeCondition,
            ),
          )
      : [],
    wantTools
      ? exec
          .select({
            assetId: toolAsset.id,
            assetCode: toolAsset.assetCode,
            name: toolType.name,
            category: toolType.category,
            typeName: toolType.name,
            classification: sql<"TOOL">`'TOOL'`,
            usageType: toolType.usageType,
            status: toolAsset.status,
            condition: toolAsset.condition,
            notes: toolAsset.notes,
            assetImageMediaId: toolAsset.imageMediaId,
            typeImageMediaId: toolType.imageMediaId,
            roomCode: room.code,
            roomName: room.name,
          })
          .from(toolAsset)
          .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
          .innerJoin(room, eq(room.id, toolAsset.roomId))
          .where(
            and(
              eq(toolAsset.active, true),
              options?.assetCode
                ? eq(toolAsset.assetCode, options.assetCode)
                : undefined,
              roomCode ? eq(room.code, roomCode) : undefined,
              scopeCondition,
            ),
          )
      : [],
  ]);
  const assets = [...instrumentAssets, ...toolAssets].sort((a, b) =>
    a.assetCode.localeCompare(b.assetCode),
  );
  if (assets.length === 0) return [];
  const instrumentAssetIds = instrumentAssets.map((asset) => asset.assetId);
  const toolAssetIds = toolAssets.map((asset) => asset.assetId);

  const [
    instrumentUnits,
    toolUnits,
    instrumentRequestStats,
    toolRequestStats,
  ] = await Promise.all([
    instrumentAssetIds.length > 0
      ? exec
          .select({
            unitId: instrumentUnit.id,
            assetId: instrumentUnit.instrumentAssetId,
            code: instrumentUnit.code,
            label: instrumentUnit.label,
            qrCode: instrumentUnit.qrCode,
            storageLocation: instrumentUnit.storageLocation,
            status: instrumentUnit.status,
            condition: instrumentUnit.condition,
            notes: instrumentUnit.notes,
            active: instrumentUnit.active,
          })
          .from(instrumentUnit)
          .where(inArray(instrumentUnit.instrumentAssetId, instrumentAssetIds))
          .orderBy(asc(instrumentUnit.code))
      : [],
    toolAssetIds.length > 0
      ? exec
          .select({
            unitId: toolUnit.id,
            assetId: toolUnit.toolAssetId,
            code: toolUnit.code,
            label: toolUnit.label,
            qrCode: toolUnit.qrCode,
            storageLocation: toolUnit.storageLocation,
            status: toolUnit.status,
            condition: toolUnit.condition,
            notes: toolUnit.notes,
            active: toolUnit.active,
          })
          .from(toolUnit)
          .where(inArray(toolUnit.toolAssetId, toolAssetIds))
          .orderBy(asc(toolUnit.code))
      : [],
    instrumentAssetIds.length > 0
      ? exec
          .select({
            assetId: instrumentRequestItem.instrumentAssetId,
            totalRequests: sql<number>`COUNT(DISTINCT ${resourceRequest.id})::int`,
            activeRequests: sql<number>`COUNT(DISTINCT CASE WHEN ${resourceRequest.status} IN ('APPROVED', 'READY_FOR_PICKUP', 'ACTIVE', 'OVERDUE') THEN ${resourceRequest.id} END)::int`,
          })
          .from(instrumentRequestItem)
          .innerJoin(
            resourceRequest,
            eq(resourceRequest.id, instrumentRequestItem.requestId),
          )
          .where(
            and(
              inArray(
                instrumentRequestItem.instrumentAssetId,
                instrumentAssetIds,
              ),
              notInArray(resourceRequest.status, [
                "CANCELLED",
                "REJECTED",
                "DRAFT",
              ]),
            ),
          )
          .groupBy(instrumentRequestItem.instrumentAssetId)
      : [],
    toolAssetIds.length > 0
      ? exec
          .select({
            assetId: toolRequestItem.toolAssetId,
            totalRequests: sql<number>`COUNT(DISTINCT ${resourceRequest.id})::int`,
            activeRequests: sql<number>`COUNT(DISTINCT CASE WHEN ${resourceRequest.status} IN ('APPROVED', 'READY_FOR_PICKUP', 'ACTIVE', 'OVERDUE') THEN ${resourceRequest.id} END)::int`,
          })
          .from(toolRequestItem)
          .innerJoin(
            resourceRequest,
            eq(resourceRequest.id, toolRequestItem.requestId),
          )
          .where(
            and(
              inArray(toolRequestItem.toolAssetId, toolAssetIds),
              notInArray(resourceRequest.status, [
                "CANCELLED",
                "REJECTED",
                "DRAFT",
              ]),
            ),
          )
          .groupBy(toolRequestItem.toolAssetId)
      : [],
  ]);
  const units = [...instrumentUnits, ...toolUnits];
  const requestStats = [...instrumentRequestStats, ...toolRequestStats];

  return assets.map<PlpEquipmentRow>((asset) => {
    const assetUnits = units.filter((unit) => unit.assetId === asset.assetId);
    const countStatus = (statuses: string[]) =>
      assetUnits.filter((unit) => unit.active && statuses.includes(unit.status))
        .length;
    const req = requestStats.find((r) => r.assetId === asset.assetId);
    return {
      assetId: asset.assetId,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      typeName: asset.typeName,
      classification: asset.classification,
      usageType: asset.usageType,
      roomCode: asset.roomCode,
      roomName: asset.roomName,
      status: asset.status,
      condition: asset.condition,
      notes: asset.notes,
      imageMediaId: asset.assetImageMediaId ?? asset.typeImageMediaId ?? null,
      unitCount: assetUnits.filter((unit) => unit.active).length,
      availableUnits: countStatus(["AVAILABLE"]),
      reservedUnits: countStatus(["RESERVED"]),
      inUseUnits: countStatus(["IN_USE"]),
      awaitingInspectionUnits: countStatus(["UNDER_INSPECTION"]),
      maintenanceUnits: countStatus(["MAINTENANCE", "DAMAGED", "RETIRED"]),
      totalRequests: req?.totalRequests ?? 0,
      activeRequests: req?.activeRequests ?? 0,
      units: assetUnits,
    };
  });
}

export async function listPlpEquipment(input: {
  room?: string;
  roomCodes?: string[] | null;
  classification?: "INSTRUMENT" | "TOOL";
  status?: string;
  condition?: string;
  usage?: "BORROWABLE" | "USAGE_ONLY";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const rows = await loadEquipmentRows(db, input.room, input.roomCodes, {
    classification: input.classification,
  });
  const search = input.search?.toLowerCase();
  const filtered = rows.filter((row) => {
    if (input.classification && row.classification !== input.classification) return false;
    if (input.usage && row.usageType !== input.usage) return false;
    if (input.condition && row.condition !== input.condition) return false;
    if (
      input.status &&
      row.status !== input.status &&
      !row.units.some((unit) => unit.active && unit.status === input.status)
    )
      return false;
    if (
      search &&
      !`${row.assetCode} ${row.name} ${row.typeName} ${row.roomName} ${row.category ?? ""}`
        .toLowerCase()
        .includes(search)
    )
      return false;
    return true;
  });
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const statusCounts: Record<string, number> = {};
  const conditionCounts: Record<string, number> = {};
  let totalUnits = 0;
  let availableUnits = 0;
  let inUseUnits = 0;
  let reservedUnits = 0;
  let maintenanceUnits = 0;
  let totalRequests = 0;
  let activeRequests = 0;
  for (const row of filtered) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    conditionCounts[row.condition] = (conditionCounts[row.condition] ?? 0) + 1;
    totalUnits += row.unitCount;
    availableUnits += row.availableUnits;
    inUseUnits += row.inUseUnits;
    reservedUnits += row.reservedUnits;
    maintenanceUnits += row.maintenanceUnits;
    totalRequests += row.totalRequests;
    activeRequests += row.activeRequests;
  }
  return {
    data: filtered.slice(offset, offset + limit),
    stats: {
      statusCounts,
      conditionCounts,
      total: filtered.length,
      unitStats: {
        totalUnits,
        availableUnits,
        inUseUnits,
        reservedUnits,
        maintenanceUnits,
        totalRequests,
        activeRequests,
      },
    },
    meta: {
      limit,
      offset,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
}

export async function getPlpEquipmentDetail(
  assetCode: string,
  roomCodes?: string[] | null,
) {
  const rows = await loadEquipmentRows(db, undefined, roomCodes, {
    assetCode,
  });
  const asset = rows.find((item) => item.assetCode === assetCode);
  if (!asset) return null;
  const reservations = await loadReservations(db, {
    statuses: ["RESERVED", "ACTIVE"],
    roomCode: asset.roomCode,
    roomCodes,
  });
  return {
    asset,
    reservations: reservations.filter(
      (item) => item.assetCode === assetCode && item.status !== "COMPLETED",
    ),
    statusRecorded: asset.status,
  };
}

export async function listPlpMaterials(input: {
  room?: string;
  roomCodes?: string[] | null;
  materialCode?: string;
  stock?: "all" | "low" | "out";
  expiry?: "all" | "soon" | "expired";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const settings = await getAppSettings();
  const rows = await listMaterialRows(db, {
    roomCode: input.room,
    roomCodes: input.roomCodes,
    materialCode: input.materialCode,
  });
  const materialIds = rows.map((row) => row.id);
  const batches = materialIds.length
    ? await db
        .select({
          batchId: materialBatch.id,
          materialId: materialBatch.materialId,
          lotNumber: materialBatch.lotNumber,
          qrCode: materialBatch.qrCode,
          storageLocation: materialBatch.storageLocation,
          quantity: materialBatch.quantity,
          expiryDate: materialBatch.expiryDate,
          active: materialBatch.active,
          roomCode: room.code,
          roomName: room.name,
        })
        .from(materialBatch)
        .innerJoin(room, eq(room.id, materialBatch.roomId))
        .where(
          and(
            inArray(materialBatch.materialId, materialIds),
            eq(materialBatch.active, true),
          ),
        )
        .orderBy(asc(materialBatch.expiryDate))
    : [];
  const stockRows = materialIds.length
    ? await listBatchStock(db, materialIds)
    : [];
  const materialReqStats = materialIds.length
    ? await db
        .select({
          materialId: materialRequestItem.materialId,
          totalRequests: sql<number>`COUNT(DISTINCT ${resourceRequest.id})::int`,
          activeRequests: sql<number>`COUNT(DISTINCT CASE WHEN ${resourceRequest.status} IN ('APPROVED', 'READY_FOR_PICKUP', 'ACTIVE', 'OVERDUE') THEN ${resourceRequest.id} END)::int`,
          totalRequestedQuantity: sql<string>`COALESCE(SUM(${materialRequestItem.requestedQuantity}), 0)::text`,
        })
        .from(materialRequestItem)
        .innerJoin(
          resourceRequest,
          eq(resourceRequest.id, materialRequestItem.requestId),
        )
        .where(
          and(
            inArray(materialRequestItem.materialId, materialIds),
            notInArray(resourceRequest.status, ["CANCELLED", "REJECTED", "DRAFT"]),
          ),
        )
        .groupBy(materialRequestItem.materialId)
    : [];
  const search = input.search?.toLowerCase();
  const mapped = rows.map<PlpMaterialRow>((row: MaterialAggregateRow) => {
    const totals = materialStockSummary(row);
    const minimum = row.minimum_quantity ? Number(row.minimum_quantity) : null;
    const threshold =
      minimum !== null ? minimum * settings.low_stock_ratio : 0;
    const lowStock =
      minimum !== null ? totals.available <= threshold : totals.available <= 0;
    const materialStock = stockRows.filter(
      (stock) => stock.materialId === row.id,
    );
    const now = Date.now();
    const soonLimit = now + 30 * DAY_MS;
    const materialBatches = batches
      .filter(
        (batch) =>
          batch.materialId === row.id && batch.roomCode === row.room_code,
      )
      .map((batch) => {
        const stockInfo = materialStock.find(
          (stock) => stock.batchId === batch.batchId,
        );
        const batchQuantity = Number(batch.quantity);
        const batchReserved = Number(stockInfo?.reserved ?? 0);
        const batchIssued = Number(stockInfo?.issued ?? 0);
        const batchCapacity = batchQuantity + batchIssued;
        return {
          batchId: batch.batchId,
          lotNumber: batch.lotNumber,
          qrCode: batch.qrCode,
          storageLocation: batch.storageLocation,
          roomCode: batch.roomCode,
          roomName: batch.roomName,
          quantity: batchQuantity,
          reserved: batchReserved,
          issued: batchIssued,
          totalCapacity: batchCapacity,
          expiryDate: batch.expiryDate?.toISOString() ?? null,
          active: batch.active,
          expired: batch.expiryDate
            ? batch.expiryDate.getTime() < now
            : false,
        };
      });
    const hasExpired = materialBatches.some((batch) => batch.expired);
    const hasExpiringSoon = materialBatches.some(
      (batch) =>
        !batch.expired &&
        batch.expiryDate !== null &&
        new Date(batch.expiryDate).getTime() <= soonLimit,
    );
    const reqStat = materialReqStats.find((r) => r.materialId === row.id);
    return {
      materialId: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      baseUnit: row.base_unit,
      unit: row.rule_unit ?? row.base_unit,
      roomCode: row.room_code ?? "",
      roomName: row.room_name ?? "Penyimpanan lab",
      physical: totals.physical,
      reserved: totals.reserved,
      issued: totals.issued,
      totalCapacity: totals.totalCapacity,
      available: totals.available,
      minimum,
      rule: dispensingRuleLabel(row),
      expiry: row.nearest_expiry
        ? new Date(row.nearest_expiry).toISOString()
        : null,
      imageMediaId: row.image_media_id ?? null,
      lowStock,
      outOfStock: totals.available <= 0,
      hasExpired,
      hasExpiringSoon,
      totalRequests: reqStat?.totalRequests ?? 0,
      activeRequests: reqStat?.activeRequests ?? 0,
      totalRequestedQuantity: Number(reqStat?.totalRequestedQuantity ?? 0),
      batches: materialBatches,
    };
  });
  const filtered = mapped.filter((row) => {
    if (input.stock === "low" && !row.lowStock) return false;
    if (input.stock === "out" && !row.outOfStock) return false;
    if (input.expiry === "expired" && !row.hasExpired) return false;
    if (input.expiry === "soon" && !row.hasExpiringSoon) return false;
    if (
      search &&
      !`${row.code} ${row.name} ${row.category ?? ""}`
        .toLowerCase()
        .includes(search)
    )
      return false;
    return true;
  });
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  return {
    data: filtered.slice(offset, offset + limit),
    meta: {
      limit,
      offset,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
}

export async function getPlpMaterialDetail(
  code: string,
  options: { room?: string; roomCodes?: string[] | null } = {},
) {
  const rows = await listPlpMaterials({
    materialCode: code,
    limit: 50,
    room: options.room,
    roomCodes: options.roomCodes,
  });
  const material = rows.data.find((row) => row.code === code);
  if (!material) return null;
  const batchIds = material.batches.map((batch) => batch.batchId);
  const transactions = batchIds.length
    ? await db
        .select({
          id: stockTransaction.id,
          type: stockTransaction.type,
          quantity: stockTransaction.quantity,
          beforeQuantity: stockTransaction.beforeQuantity,
          afterQuantity: stockTransaction.afterQuantity,
          reason: stockTransaction.reason,
          createdAt: stockTransaction.createdAt,
          actorName: user.name,
        })
        .from(stockTransaction)
        .leftJoin(user, eq(user.id, stockTransaction.performedById))
        .where(inArray(stockTransaction.materialBatchId, batchIds))
        .orderBy(desc(stockTransaction.createdAt))
        .limit(30)
    : [];
  return {
    material,
    transactions: transactions.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      beforeQuantity: Number(row.beforeQuantity),
      afterQuantity: Number(row.afterQuantity),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function listPlpHistory(input: {
  entity?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  roomCodes?: string[] | null;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (input.entity) conditions.push(eq(auditLog.entityType, input.entity));
  if (input.action)
    conditions.push(sql`${auditLog.action}::text = ${input.action}`);
  if (input.actor)
    conditions.push(sql`${user.name} ILIKE ${`%${input.actor}%`}`);
  if (input.from)
    conditions.push(
      gte(auditLog.createdAt, new Date(`${input.from}T00:00:00+07:00`)),
    );
  if (input.to)
    conditions.push(
      lte(auditLog.createdAt, new Date(`${input.to}T23:59:59.999+07:00`)),
    );
  // Scoped PLP history only keeps entries whose record belongs to an assigned
  // lab. Entries without a room (roles, settings) stay admin-only.
  if (input.roomCodes !== undefined) {
    if (input.roomCodes === null) {
      // no filter
    } else if (input.roomCodes.length === 0) {
      conditions.push(sql`false`);
    } else {
      conditions.push(auditRoomScopeSql(input.roomCodes));
    }
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = input.limit ?? 25;
  const offset = input.offset ?? 0;
  const [data, totalRow] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        actorName: user.name,
        reason: auditLog.reason,
        createdAt: auditLog.createdAt,
        afterData: auditLog.afterData,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .where(where)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .where(where),
  ]);
  const total = totalRow[0]?.count ?? 0;
  return {
    data: data.map<PlpHistoryEntry>((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorName: row.actorName,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      afterData: row.afterData,
    })),
    meta: {
      limit,
      offset,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// The same month calendar the student workspace uses, filled with every
// request and reservation so PLP and admin can read the global schedule.
export async function loadScheduleCalendar(input: {
  month: { year: number; month: number };
  room?: string;
  roomCodes?: string[] | null;
  kind?: "all" | "request" | "reservation";
  viewerId: string;
}): Promise<ScheduleEvent[]> {
  const months = scheduleMonths(input.month);
  const first = months[0];
  const last = months[months.length - 1];
  const monthKey = (value: { year: number; month: number }) =>
    `${value.year}-${String(value.month + 1).padStart(2, "0")}`;
  const lastDay = new Date(last.year, last.month + 1, 0).getDate();
  const from = new Date(`${monthKey(first)}-01T00:00:00+07:00`);
  const to = new Date(
    `${monthKey(last)}-${String(lastDay).padStart(2, "0")}T23:59:59.999+07:00`,
  );
  const [requests, reservations] = await Promise.all([
    input.kind === "reservation"
      ? Promise.resolve<RequestDto[]>([])
      : loadRequestDtos(db, {
          from,
          to,
          roomCode: input.room,
          roomCodes: input.roomCodes,
          statuses: [
            "APPROVED",
            "READY_FOR_PICKUP",
            "ACTIVE",
            "RETURNED",
            "OVERDUE",
            "COMPLETED",
          ],
          limit: 500,
        }),
    input.kind === "request"
      ? Promise.resolve<ReservationDto[]>([])
      : loadReservations(db, {
          from,
          to,
          roomCode: input.room,
          roomCodes: input.roomCodes,
          statuses: ["RESERVED", "ACTIVE", "COMPLETED"],
        }),
  ]);
  return buildCalendarEvents({
    requests,
    reservations,
    month: input.month,
    months,
    viewerId: input.viewerId,
    skipSubsumedReservations: false,
  });
}

export async function getPlpBadgeCounts(
  userId: string,
  roomCodes?: string[] | null,
) {
  const [pending, issue, returns, unread] = await Promise.all([
    countRequestRows(db, { statuses: ["PENDING_PLP"], roomCodes }),
    countRequestRows(db, {
      statuses: ["APPROVED", "READY_FOR_PICKUP"],
      roomCodes,
    }),
    countRequestRows(db, {
      statuses: ["ACTIVE", "RETURNED", "OVERDUE"],
      roomCodes,
    }),
    countUnreadNotifications(userId),
  ]);
  return { pending, issue, returns, unread };
}

export async function getPlpDashboard(
  userId: string,
  roomCodes?: string[] | null,
): Promise<PlpDashboard> {
  const { end: todayEnd } = jakartaDayRange();
  const now = new Date();
  const [
    pending,
    pendingTotal,
    issueQueueRaw,
    issueTotal,
    returnQueueRaw,
    returnTotal,
    materials,
    incidentPage,
    upcoming,
    unread,
    maintenanceUnits,
  ] = await Promise.all([
    loadRequestDtos(db, { statuses: ["PENDING_PLP"], roomCodes, limit: 6 }),
    countRequestRows(db, { statuses: ["PENDING_PLP"], roomCodes }),
    loadRequestDtos(db, {
      statuses: ["APPROVED", "READY_FOR_PICKUP"],
      to: todayEnd,
      roomCodes,
      limit: 50,
    }),
    countRequestRows(db, {
      statuses: ["APPROVED", "READY_FOR_PICKUP"],
      to: todayEnd,
      roomCodes,
    }),
    loadRequestDtos(db, {
      statuses: ["ACTIVE", "RETURNED", "OVERDUE"],
      roomCodes,
      limit: 100,
    }),
    countRequestRows(db, {
      statuses: ["ACTIVE", "RETURNED", "OVERDUE"],
      roomCodes,
    }),
    listPlpMaterials({ stock: "low", roomCodes, limit: 6 }),
    listIncidentPage({
      statuses: ["REPORTED", "UNDER_ASSESSMENT", "IN_MAINTENANCE"],
      roomCodes,
      limit: 6,
    }),
    loadReservations(db, {
      statuses: ["RESERVED"],
      from: now,
      to: new Date(now.getTime() + 7 * DAY_MS),
      roomCodes,
    }),
    countUnreadNotifications(userId),
    listMaintenanceUnits(roomCodes),
  ]);
  const issueQueue = [...issueQueueRaw]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 8);
  const returnQueue = [...returnQueueRaw]
    .filter(
      (request) =>
        request.status === "RETURNED" ||
        request.status === "OVERDUE" ||
        new Date(request.endAt).getTime() <= todayEnd.getTime(),
    )
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    .slice(0, 8);
  return {
    generatedAt: now.toISOString(),
    counts: {
      pending: pendingTotal,
      issueDue: issueTotal,
      returnDue: returnTotal,
      lowStock: materials.meta.total,
      openIncidents: incidentPage.meta.total,
      upcoming: upcoming.length,
      maintenance: maintenanceUnits.length,
    },
    pending,
    issueQueue,
    returnQueue,
    lowStock: materials.data,
    incidents: incidentPage.data,
    upcoming: upcoming.slice(0, 6),
    maintenanceUnits,
    unread,
  };
}

export type MaintenanceUnitDto = {
  id: string;
  code: string;
  label: string;
  status: string;
  condition: string;
  notes: string | null;
  updatedAt: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  usageType: "BORROWABLE" | "USAGE_ONLY";
  roomCode: string;
  roomName: string;
  imageMediaId: string | null;
};

export async function listMaintenanceUnits(
  roomCodes?: string[] | null,
): Promise<MaintenanceUnitDto[]> {
  const scopeCondition =
    roomCodes === undefined || roomCodes === null
      ? undefined
      : roomCodes.length === 0
        ? sql`false`
        : inArray(room.code, roomCodes);

  const [instrumentRows, toolRows] = await Promise.all([
    db
      .select({
        id: instrumentUnit.id,
        code: instrumentUnit.code,
        label: instrumentUnit.label,
        status: instrumentUnit.status,
        condition: instrumentUnit.condition,
        notes: instrumentUnit.notes,
        updatedAt: instrumentUnit.updatedAt,
        assetId: instrumentAsset.id,
        assetCode: instrumentAsset.assetCode,
        assetName: instrumentType.name,
        usageType: instrumentType.usageType,
        roomCode: room.code,
        roomName: room.name,
        assetImageMediaId: instrumentAsset.imageMediaId,
        typeImageMediaId: instrumentType.imageMediaId,
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
      .where(
        and(
          eq(instrumentUnit.active, true),
          inArray(instrumentUnit.status, [
            "MAINTENANCE",
            "DAMAGED",
            "UNDER_INSPECTION",
          ]),
          scopeCondition,
        ),
      ),
    db
      .select({
        id: toolUnit.id,
        code: toolUnit.code,
        label: toolUnit.label,
        status: toolUnit.status,
        condition: toolUnit.condition,
        notes: toolUnit.notes,
        updatedAt: toolUnit.updatedAt,
        assetId: toolAsset.id,
        assetCode: toolAsset.assetCode,
        assetName: toolType.name,
        usageType: toolType.usageType,
        roomCode: room.code,
        roomName: room.name,
        assetImageMediaId: toolAsset.imageMediaId,
        typeImageMediaId: toolType.imageMediaId,
      })
      .from(toolUnit)
      .innerJoin(
        toolAsset,
        eq(toolAsset.id, toolUnit.toolAssetId),
      )
      .innerJoin(
        toolType,
        eq(toolType.id, toolAsset.toolTypeId),
      )
      .innerJoin(room, eq(room.id, toolAsset.roomId))
      .where(
        and(
          eq(toolUnit.active, true),
          inArray(toolUnit.status, [
            "MAINTENANCE",
            "DAMAGED",
            "UNDER_INSPECTION",
          ]),
          scopeCondition,
        ),
      ),
  ]);

  const rows = [...instrumentRows, ...toolRows].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    status: row.status,
    condition: row.condition,
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
    assetId: row.assetId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    usageType: row.usageType,
    roomCode: row.roomCode,
    roomName: row.roomName,
    imageMediaId: row.assetImageMediaId ?? row.typeImageMediaId ?? null,
  }));
}

export async function listEquipmentTypesForPlp() {
  const [instruments, tools] = await Promise.all([
    db
      .select({
        id: instrumentType.id,
        name: instrumentType.name,
        category: instrumentType.category,
        usageType: instrumentType.usageType,
        imageMediaId: instrumentType.imageMediaId,
        classification: sql<"INSTRUMENT">`'INSTRUMENT'`,
      })
      .from(instrumentType)
      .where(eq(instrumentType.active, true)),
    db
      .select({
        id: toolType.id,
        name: toolType.name,
        category: toolType.category,
        usageType: toolType.usageType,
        imageMediaId: toolType.imageMediaId,
        classification: sql<"TOOL">`'TOOL'`,
      })
      .from(toolType)
      .where(eq(toolType.active, true)),
  ]);
  return [...instruments, ...tools].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPlpEquipmentAsset(
  actorId: string,
  scope: RoomScope,
  input: PlpEquipmentAssetInput,
) {
  assertRoomInScope(scope, input.roomCode);
  return db.transaction(async (tx) => {
    let classification: "INSTRUMENT" | "TOOL" = "INSTRUMENT";
    let typeId = input.equipmentTypeId;
    let typeName = "";

    if (!typeId && input.newType) {
      classification = input.newType.classification ?? "INSTRUMENT";
      if (classification === "INSTRUMENT") {
        const [newTypeRow] = await tx
          .insert(instrumentType)
          .values({
            name: input.newType.name.trim(),
            category: input.newType.category
              ? input.newType.category.trim()
              : null,
            usageType: input.newType.usageType,
            imageMediaId: input.newType.imageMediaId ?? null,
          })
          .returning();
        typeId = newTypeRow.id;
        typeName = newTypeRow.name;
      } else {
        const [newTypeRow] = await tx
          .insert(toolType)
          .values({
            name: input.newType.name.trim(),
            category: input.newType.category
              ? input.newType.category.trim()
              : null,
            usageType: input.newType.usageType,
            imageMediaId: input.newType.imageMediaId ?? null,
          })
          .returning();
        typeId = newTypeRow.id;
        typeName = newTypeRow.name;
      }
    } else {
      const [insType] = await tx
        .select()
        .from(instrumentType)
        .where(eq(instrumentType.id, typeId!))
        .limit(1);
      if (insType) {
        classification = "INSTRUMENT";
        typeName = insType.name;
      } else {
        const [tolType] = await tx
          .select()
          .from(toolType)
          .where(eq(toolType.id, typeId!))
          .limit(1);
        if (tolType) {
          classification = "TOOL";
          typeName = tolType.name;
        } else {
          throw new ApiError(404, "NOT_FOUND", "Type tidak ditemukan.");
        }
      }
    }

    const [roomRow] = await tx
      .select()
      .from(room)
      .where(eq(room.code, input.roomCode))
      .limit(1);
    if (!roomRow)
      throw new ApiError(404, "NOT_FOUND", "Room tidak ditemukan.");

    const [existingIns, existingTol] = await Promise.all([
      tx
        .select({ id: instrumentAsset.id })
        .from(instrumentAsset)
        .where(eq(instrumentAsset.assetCode, input.assetCode))
        .limit(1),
      tx
        .select({ id: toolAsset.id })
        .from(toolAsset)
        .where(eq(toolAsset.assetCode, input.assetCode))
        .limit(1),
    ]);
    if (existingIns.length > 0 || existingTol.length > 0) {
      throw new ApiError(
        409,
        "CODE_TAKEN",
        `Kode asset ${input.assetCode} sudah dipakai.`,
      );
    }

    const unitCount = input.unitCount ?? 1;
    const defaultStorage =
      input.storageLocation?.trim() ||
      (classification === "INSTRUMENT" ? "Gudang Instrumen" : "Gudang Alat");

    if (classification === "INSTRUMENT") {
      const [created] = await tx
        .insert(instrumentAsset)
        .values({
          instrumentTypeId: typeId!,
          roomId: roomRow.id,
          assetCode: input.assetCode,
          serialNumber: input.serialNumber ? input.serialNumber.trim() : null,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
          imageMediaId: input.imageMediaId ?? null,
          active: input.active,
        })
        .returning();

      if (unitCount === 1) {
        const unitCode = `${created.assetCode}-01`;
        await tx.insert(instrumentUnit).values({
          instrumentAssetId: created.id,
          code: unitCode,
          label: `${typeName} 01`,
          qrCode: `RK-INS-${unitCode}`,
          storageLocation: defaultStorage,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
        });
      } else {
        const unitsToInsert = [];
        for (let i = 1; i <= unitCount; i++) {
          const numStr = String(i).padStart(2, "0");
          const unitCode = `${created.assetCode}-${numStr}`;
          unitsToInsert.push({
            instrumentAssetId: created.id,
            code: unitCode,
            label: `${typeName} ${numStr}`,
            qrCode: `RK-INS-${unitCode}`,
            storageLocation: defaultStorage,
            status: input.status,
            condition: input.condition,
            notes: input.notes ? input.notes.trim() : null,
          });
        }
        await tx.insert(instrumentUnit).values(unitsToInsert);
      }

      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "instrument_asset",
        entityId: created.id,
        after: {
          assetCode: created.assetCode,
          room: roomRow.code,
          units: unitCount,
        },
      });

      return created;
    } else {
      const [created] = await tx
        .insert(toolAsset)
        .values({
          toolTypeId: typeId!,
          roomId: roomRow.id,
          assetCode: input.assetCode,
          serialNumber: input.serialNumber ? input.serialNumber.trim() : null,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
          imageMediaId: input.imageMediaId ?? null,
          active: input.active,
        })
        .returning();

      if (unitCount === 1) {
        const unitCode = `${created.assetCode}-01`;
        await tx.insert(toolUnit).values({
          toolAssetId: created.id,
          code: unitCode,
          label: `${typeName} 01`,
          qrCode: `RK-TOL-${unitCode}`,
          storageLocation: defaultStorage,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
        });
      } else {
        const unitsToInsert = [];
        for (let i = 1; i <= unitCount; i++) {
          const numStr = String(i).padStart(2, "0");
          const unitCode = `${created.assetCode}-${numStr}`;
          unitsToInsert.push({
            toolAssetId: created.id,
            code: unitCode,
            label: `${typeName} ${numStr}`,
            qrCode: `RK-TOL-${unitCode}`,
            storageLocation: defaultStorage,
            status: input.status,
            condition: input.condition,
            notes: input.notes ? input.notes.trim() : null,
          });
        }
        await tx.insert(toolUnit).values(unitsToInsert);
      }

      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "tool_asset",
        entityId: created.id,
        after: {
          assetCode: created.assetCode,
          room: roomRow.code,
          units: unitCount,
        },
      });

      return created;
    }
  });
}

export async function createPlpMaterial(
  actorId: string,
  scope: RoomScope,
  input: PlpMaterialCreateInput,
) {
  if (input.initialBatch?.roomCode) {
    assertRoomInScope(scope, input.initialBatch.roomCode);
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: material.id })
      .from(material)
      .where(eq(material.code, input.code))
      .limit(1);
    if (existing.length > 0) {
      throw new ApiError(409, "CODE_TAKEN", `Kode material ${input.code} sudah dipakai.`);
    }

    const [createdMaterial] = await tx
      .insert(material)
      .values({
        code: input.code,
        name: input.name,
        category: input.category ? input.category.trim() : null,
        baseUnit: input.baseUnit,
        description: input.description ? input.description.trim() : null,
        imageMediaId: input.imageMediaId ?? null,
        active: true,
      })
      .returning();

    await tx.insert(materialDispensingRule).values({
      materialId: createdMaterial.id,
      minimumQuantity: "10.000",
      dispensingIncrement: "10.000",
      maximumQuantity: "1000.000",
      unit: input.baseUnit,
    });

    if (input.initialBatch) {
      const [roomRow] = await tx
        .select()
        .from(room)
        .where(eq(room.code, input.initialBatch.roomCode))
        .limit(1);
      if (!roomRow) {
        throw new ApiError(404, "NOT_FOUND", "Room untuk batch tidak ditemukan.");
      }

      const lot = input.initialBatch.lotNumber?.trim() || `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiry = input.initialBatch.expiryDate ? new Date(input.initialBatch.expiryDate) : null;
      const defaultStorage =
        input.initialBatch.storageLocation?.trim() ||
        (input.category === "Pelarut" ? "Lemari Asam / B3" : "Gudang Reagen");

      const [batch] = await tx
        .insert(materialBatch)
        .values({
          materialId: createdMaterial.id,
          roomId: roomRow.id,
          lotNumber: lot,
          qrCode: `RK-MAT-${lot}`,
          storageLocation: defaultStorage,
          quantity: input.initialBatch.quantity.toFixed(3),
          expiryDate: expiry,
          active: true,
        })
        .returning();

      await recordStockTransaction(tx, {
        batchId: batch.id,
        type: "RECEIVE",
        quantity: input.initialBatch.quantity,
        before: 0,
        after: input.initialBatch.quantity,
        referenceType: "intake",
        referenceId: batch.id,
        performedById: actorId,
        reason:
          input.initialBatch.source === "GRANT_HIBAH"
            ? "Penerimaan Bahan Hibah Dosen/Riset"
            : input.initialBatch.source === "LEFTOVER"
              ? "Penerimaan Sisa Praktikum Mahasiswa"
              : "Pengadaan Bahan Laboratorium Baru",
      });
    }

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "material",
      entityId: createdMaterial.id,
      after: { code: createdMaterial.code, name: createdMaterial.name },
    });

    return createdMaterial;
  });
}

export async function createPlpEquipmentUnit(
  actorId: string,
  scope: RoomScope,
  assetCode: string,
  input: PlpEquipmentUnitInput,
) {
  return db.transaction(async (tx) => {
    const [insAsset] = await tx
      .select({
        id: instrumentAsset.id,
        assetCode: instrumentAsset.assetCode,
        roomCode: room.code,
      })
      .from(instrumentAsset)
      .innerJoin(room, eq(room.id, instrumentAsset.roomId))
      .where(eq(instrumentAsset.assetCode, assetCode))
      .limit(1);

    const asset = insAsset
      ? { ...insAsset, kind: "INSTRUMENT" as const }
      : await tx
          .select({
            id: toolAsset.id,
            assetCode: toolAsset.assetCode,
            roomCode: room.code,
          })
          .from(toolAsset)
          .innerJoin(room, eq(room.id, toolAsset.roomId))
          .where(eq(toolAsset.assetCode, assetCode))
          .limit(1)
          .then((rows) =>
            rows[0] ? { ...rows[0], kind: "TOOL" as const } : null,
          );

    if (!asset)
      throw new ApiError(404, "NOT_FOUND", "Asset tidak ditemukan.");

    assertRoomInScope(scope, asset.roomCode);

    const [existingIns, existingTol] = await Promise.all([
      tx
        .select({ id: instrumentUnit.id })
        .from(instrumentUnit)
        .where(eq(instrumentUnit.code, input.code))
        .limit(1),
      tx
        .select({ id: toolUnit.id })
        .from(toolUnit)
        .where(eq(toolUnit.code, input.code))
        .limit(1),
    ]);
    if (existingIns.length > 0 || existingTol.length > 0) {
      throw new ApiError(
        409,
        "CODE_TAKEN",
        `Kode unit ${input.code} sudah dipakai.`,
      );
    }

    if (asset.kind === "INSTRUMENT") {
      const [created] = await tx
        .insert(instrumentUnit)
        .values({
          instrumentAssetId: asset.id,
          code: input.code,
          label: input.label,
          qrCode: `RK-INS-${input.code}`,
          storageLocation: input.storageLocation?.trim() || null,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
          active: input.active,
        })
        .returning();

      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "instrument_unit",
        entityId: created.id,
        after: { code: created.code, asset: asset.assetCode },
      });

      return created;
    } else {
      const [created] = await tx
        .insert(toolUnit)
        .values({
          toolAssetId: asset.id,
          code: input.code,
          label: input.label,
          qrCode: `RK-TOL-${input.code}`,
          storageLocation: input.storageLocation?.trim() || null,
          status: input.status,
          condition: input.condition,
          notes: input.notes ? input.notes.trim() : null,
          active: input.active,
        })
        .returning();

      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "tool_unit",
        entityId: created.id,
        after: { code: created.code, asset: asset.assetCode },
      });

      return created;
    }
  });
}

export async function createPlpMaterialBatch(
  actorId: string,
  scope: RoomScope,
  materialCode: string,
  input: PlpMaterialBatchInput,
) {
  assertRoomInScope(scope, input.roomCode);
  return db.transaction(async (tx) => {
    const [materialRow] = await tx
      .select()
      .from(material)
      .where(eq(material.code, materialCode))
      .limit(1);
    if (!materialRow)
      throw new ApiError(404, "NOT_FOUND", "Material tidak ditemukan.");

    const [roomRow] = await tx
      .select()
      .from(room)
      .where(eq(room.code, input.roomCode))
      .limit(1);
    if (!roomRow)
      throw new ApiError(404, "NOT_FOUND", "Room tidak ditemukan.");

    const lot = input.lotNumber?.trim() || `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await tx
      .insert(materialBatch)
      .values({
        materialId: materialRow.id,
        roomId: roomRow.id,
        lotNumber: lot,
        qrCode: `RK-MAT-${lot}`,
        storageLocation: input.storageLocation?.trim() || "Gudang Reagen",
        quantity: input.quantity.toFixed(3),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        active: input.active,
      })
      .returning();

    await recordStockTransaction(tx, {
      batchId: created.id,
      type: "RECEIVE",
      quantity: input.quantity,
      before: 0,
      after: input.quantity,
      referenceType: "material_batch",
      referenceId: created.id,
      performedById: actorId,
      reason: "Penerimaan batch baru oleh PLP",
    });

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "material_batch",
      entityId: created.id,
      after: {
        material: materialRow.code,
        lot: created.lotNumber,
        quantity: Number(created.quantity),
        room: roomRow.code,
      },
    });

    return created;
  });
}

export async function adjustPlpMaterialStock(
  actorId: string,
  scope: RoomScope,
  batchId: string,
  input: PlpStockAdjustInput,
) {
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .select({
        id: materialBatch.id,
        quantity: materialBatch.quantity,
        roomCode: room.code,
        materialCode: material.code,
      })
      .from(materialBatch)
      .innerJoin(room, eq(room.id, materialBatch.roomId))
      .innerJoin(material, eq(material.id, materialBatch.materialId))
      .where(eq(materialBatch.id, batchId))
      .limit(1)
      .for("update");
    if (!batch)
      throw new ApiError(404, "NOT_FOUND", "Batch tidak ditemukan.");

    assertRoomInScope(scope, batch.roomCode);

    const currentQty = Number(batch.quantity);
    const newQty = Math.round((currentQty + input.deltaQuantity) * 1000) / 1000;
    if (newQty < 0) {
      throw new ApiError(
        400,
        "INVALID_QUANTITY",
        "Stok fisik setelah penyesuaian tidak boleh negatif.",
      );
    }

    const [updated] = await tx
      .update(materialBatch)
      .set({
        quantity: newQty.toFixed(3),
      })
      .where(eq(materialBatch.id, batchId))
      .returning();

    await recordStockTransaction(tx, {
      batchId: batch.id,
      type: input.type,
      quantity: Math.abs(input.deltaQuantity),
      before: currentQty,
      after: newQty,
      referenceType: "manual_adjustment",
      referenceId: batch.id,
      performedById: actorId,
      reason: input.reason,
    });

    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "material_batch",
      entityId: batch.id,
      before: { quantity: currentQty },
      after: { quantity: newQty, type: input.type, reason: input.reason },
    });

    return updated;
  });
}

export async function assertEquipmentUnitInScope(
  scope: RoomScope,
  unitId: string,
) {
  if (scope.all) return;
  const [insUnit] = await db
    .select({ roomCode: room.code })
    .from(instrumentUnit)
    .innerJoin(
      instrumentAsset,
      eq(instrumentAsset.id, instrumentUnit.instrumentAssetId),
    )
    .innerJoin(room, eq(room.id, instrumentAsset.roomId))
    .where(eq(instrumentUnit.id, unitId))
    .limit(1);

  if (insUnit) {
    assertRoomInScope(scope, insUnit.roomCode);
    return;
  }

  const [tolUnit] = await db
    .select({ roomCode: room.code })
    .from(toolUnit)
    .innerJoin(toolAsset, eq(toolAsset.id, toolUnit.toolAssetId))
    .innerJoin(room, eq(room.id, toolAsset.roomId))
    .where(eq(toolUnit.id, unitId))
    .limit(1);

  if (!tolUnit) {
    throw new ApiError(404, "NOT_FOUND", "Unit tidak ditemukan.");
  }
  assertRoomInScope(scope, tolUnit.roomCode);
}

export async function deletePlpEquipmentUnit(
  actorId: string,
  scope: RoomScope,
  unitId: string,
) {
  return db.transaction(async (tx) => {
    const [insUnit] = await tx
      .select({
        id: instrumentUnit.id,
        code: instrumentUnit.code,
        label: instrumentUnit.label,
        status: instrumentUnit.status,
        instrumentAssetId: instrumentUnit.instrumentAssetId,
        assetCode: instrumentAsset.assetCode,
        roomCode: room.code,
      })
      .from(instrumentUnit)
      .innerJoin(
        instrumentAsset,
        eq(instrumentAsset.id, instrumentUnit.instrumentAssetId),
      )
      .innerJoin(room, eq(room.id, instrumentAsset.roomId))
      .where(eq(instrumentUnit.id, unitId))
      .limit(1);

    const unit = insUnit
      ? { ...insUnit, kind: "INSTRUMENT" as const }
      : await tx
          .select({
            id: toolUnit.id,
            code: toolUnit.code,
            label: toolUnit.label,
            status: toolUnit.status,
            toolAssetId: toolUnit.toolAssetId,
            assetCode: toolAsset.assetCode,
            roomCode: room.code,
          })
          .from(toolUnit)
          .innerJoin(toolAsset, eq(toolAsset.id, toolUnit.toolAssetId))
          .innerJoin(room, eq(room.id, toolAsset.roomId))
          .where(eq(toolUnit.id, unitId))
          .limit(1)
          .then((rows) =>
            rows[0] ? { ...rows[0], kind: "TOOL" as const } : null,
          );

    if (!unit) {
      throw new ApiError(404, "NOT_FOUND", "Unit tidak ditemukan.");
    }

    assertRoomInScope(scope, unit.roomCode);

    if (unit.status === "IN_USE" || unit.status === "RESERVED") {
      throw new ApiError(
        400,
        "UNIT_IN_USE",
        `Unit ${unit.code} sedang berstatus ${unit.status} dan tidak dapat dihapus.`,
      );
    }

    if (unit.kind === "INSTRUMENT") {
      const [activeRes] = await tx
        .select({ count: count() })
        .from(reservation)
        .where(
          and(
            eq(reservation.instrumentUnitId, unitId),
            inArray(reservation.status, ["RESERVED", "ACTIVE"]),
          ),
        );

      if (Number(activeRes?.count ?? 0) > 0) {
        throw new ApiError(
          400,
          "ACTIVE_RESERVATION",
          `Unit ${unit.code} memiliki jadwal reservasi aktif. Batalkan atau selesaikan reservasi terlebih dahulu.`,
        );
      }

      await tx
        .delete(reservation)
        .where(eq(reservation.instrumentUnitId, unitId));
      await tx
        .delete(instrumentRequestItem)
        .where(eq(instrumentRequestItem.instrumentUnitId, unitId));
      await tx
        .update(issueTransaction)
        .set({ instrumentUnitId: null })
        .where(eq(issueTransaction.instrumentUnitId, unitId));
      await tx
        .update(stockOpnameEntry)
        .set({ instrumentUnitId: null })
        .where(eq(stockOpnameEntry.instrumentUnitId, unitId));
      await tx
        .delete(instrumentConditionHistory)
        .where(eq(instrumentConditionHistory.instrumentUnitId, unitId));
      await tx.delete(instrumentUnit).where(eq(instrumentUnit.id, unitId));

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "instrument_unit",
        entityId: unit.id,
        before: {
          code: unit.code,
          label: unit.label,
          assetCode: unit.assetCode,
          roomCode: unit.roomCode,
        },
      });

      return { success: true, code: unit.code };
    } else {
      const [activeRes] = await tx
        .select({ count: count() })
        .from(reservation)
        .where(
          and(
            eq(reservation.toolUnitId, unitId),
            inArray(reservation.status, ["RESERVED", "ACTIVE"]),
          ),
        );

      if (Number(activeRes?.count ?? 0) > 0) {
        throw new ApiError(
          400,
          "ACTIVE_RESERVATION",
          `Unit ${unit.code} memiliki jadwal reservasi aktif. Batalkan atau selesaikan reservasi terlebih dahulu.`,
        );
      }

      await tx.delete(reservation).where(eq(reservation.toolUnitId, unitId));
      await tx
        .delete(toolRequestItem)
        .where(eq(toolRequestItem.toolUnitId, unitId));
      await tx
        .update(issueTransaction)
        .set({ toolUnitId: null })
        .where(eq(issueTransaction.toolUnitId, unitId));
      await tx
        .update(stockOpnameEntry)
        .set({ toolUnitId: null })
        .where(eq(stockOpnameEntry.toolUnitId, unitId));
      await tx
        .delete(toolConditionHistory)
        .where(eq(toolConditionHistory.toolUnitId, unitId));
      await tx.delete(toolUnit).where(eq(toolUnit.id, unitId));

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "tool_unit",
        entityId: unit.id,
        before: {
          code: unit.code,
          label: unit.label,
          assetCode: unit.assetCode,
          roomCode: unit.roomCode,
        },
      });

      return { success: true, code: unit.code };
    }
  });
}

export async function deletePlpEquipmentAsset(
  actorId: string,
  scope: RoomScope,
  assetCode: string,
) {
  return db.transaction(async (tx) => {
    const [insAsset] = await tx
      .select({
        id: instrumentAsset.id,
        assetCode: instrumentAsset.assetCode,
        status: instrumentAsset.status,
        typeId: instrumentAsset.instrumentTypeId,
        roomCode: room.code,
      })
      .from(instrumentAsset)
      .innerJoin(room, eq(room.id, instrumentAsset.roomId))
      .where(eq(instrumentAsset.assetCode, assetCode))
      .limit(1);

    const asset = insAsset
      ? { ...insAsset, kind: "INSTRUMENT" as const }
      : await tx
          .select({
            id: toolAsset.id,
            assetCode: toolAsset.assetCode,
            status: toolAsset.status,
            typeId: toolAsset.toolTypeId,
            roomCode: room.code,
          })
          .from(toolAsset)
          .innerJoin(room, eq(room.id, toolAsset.roomId))
          .where(eq(toolAsset.assetCode, assetCode))
          .limit(1)
          .then((rows) =>
            rows[0] ? { ...rows[0], kind: "TOOL" as const } : null,
          );

    if (!asset) {
      throw new ApiError(404, "NOT_FOUND", "Aset peralatan tidak ditemukan.");
    }

    assertRoomInScope(scope, asset.roomCode);

    if (asset.status === "IN_USE") {
      throw new ApiError(
        400,
        "ASSET_IN_USE",
        `Aset ${asset.assetCode} sedang digunakan dan tidak dapat dihapus.`,
      );
    }

    if (asset.kind === "INSTRUMENT") {
      const units = await tx
        .select({
          id: instrumentUnit.id,
          code: instrumentUnit.code,
          status: instrumentUnit.status,
        })
        .from(instrumentUnit)
        .where(eq(instrumentUnit.instrumentAssetId, asset.id));

      const busyUnit = units.find(
        (u) => u.status === "IN_USE" || u.status === "RESERVED",
      );
      if (busyUnit) {
        throw new ApiError(
          400,
          "UNIT_IN_USE",
          `Unit ${busyUnit.code} sedang berstatus ${busyUnit.status}. Selesaikan penggunaan sebelum menghapus aset.`,
        );
      }

      const unitIds = units.map((u) => u.id);
      if (unitIds.length > 0) {
        const [activeRes] = await tx
          .select({ count: count() })
          .from(reservation)
          .where(
            and(
              inArray(reservation.instrumentUnitId, unitIds),
              inArray(reservation.status, ["RESERVED", "ACTIVE"]),
            ),
          );
        if (Number(activeRes?.count ?? 0) > 0) {
          throw new ApiError(
            400,
            "ACTIVE_RESERVATION",
            `Aset ${asset.assetCode} memiliki unit dengan reservasi aktif.`,
          );
        }

        await tx
          .delete(reservation)
          .where(inArray(reservation.instrumentUnitId, unitIds));
        await tx
          .delete(instrumentRequestItem)
          .where(inArray(instrumentRequestItem.instrumentUnitId, unitIds));
        await tx
          .update(issueTransaction)
          .set({ instrumentUnitId: null })
          .where(inArray(issueTransaction.instrumentUnitId, unitIds));
        await tx
          .update(stockOpnameEntry)
          .set({ instrumentUnitId: null })
          .where(inArray(stockOpnameEntry.instrumentUnitId, unitIds));
        await tx
          .delete(instrumentConditionHistory)
          .where(inArray(instrumentConditionHistory.instrumentUnitId, unitIds));
        await tx
          .delete(instrumentUnit)
          .where(inArray(instrumentUnit.id, unitIds));
      }

      await tx
        .delete(reservation)
        .where(eq(reservation.instrumentAssetId, asset.id));
      await tx
        .delete(instrumentRequestItem)
        .where(eq(instrumentRequestItem.instrumentAssetId, asset.id));
      await tx
        .delete(returnTransaction)
        .where(eq(returnTransaction.instrumentAssetId, asset.id));
      await tx
        .update(issueTransaction)
        .set({ instrumentAssetId: null })
        .where(eq(issueTransaction.instrumentAssetId, asset.id));
      await tx
        .update(stockOpnameEntry)
        .set({ instrumentAssetId: null })
        .where(eq(stockOpnameEntry.instrumentAssetId, asset.id));
      await tx
        .update(incident)
        .set({ instrumentAssetId: null })
        .where(eq(incident.instrumentAssetId, asset.id));
      await tx
        .delete(instrumentConditionHistory)
        .where(eq(instrumentConditionHistory.instrumentAssetId, asset.id));
      await tx
        .delete(instrumentAsset)
        .where(eq(instrumentAsset.id, asset.id));

      const remainingAssets = await tx
        .select({ count: count() })
        .from(instrumentAsset)
        .where(eq(instrumentAsset.instrumentTypeId, asset.typeId));

      if (Number(remainingAssets[0]?.count ?? 0) === 0) {
        await tx
          .delete(instrumentType)
          .where(eq(instrumentType.id, asset.typeId));
      }

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "instrument_asset",
        entityId: asset.id,
        before: {
          assetCode: asset.assetCode,
          roomCode: asset.roomCode,
        },
      });

      return { success: true, assetCode: asset.assetCode };
    } else {
      const units = await tx
        .select({
          id: toolUnit.id,
          code: toolUnit.code,
          status: toolUnit.status,
        })
        .from(toolUnit)
        .where(eq(toolUnit.toolAssetId, asset.id));

      const busyUnit = units.find(
        (u) => u.status === "IN_USE" || u.status === "RESERVED",
      );
      if (busyUnit) {
        throw new ApiError(
          400,
          "UNIT_IN_USE",
          `Unit ${busyUnit.code} sedang berstatus ${busyUnit.status}. Selesaikan penggunaan sebelum menghapus aset.`,
        );
      }

      const unitIds = units.map((u) => u.id);
      if (unitIds.length > 0) {
        const [activeRes] = await tx
          .select({ count: count() })
          .from(reservation)
          .where(
            and(
              inArray(reservation.toolUnitId, unitIds),
              inArray(reservation.status, ["RESERVED", "ACTIVE"]),
            ),
          );
        if (Number(activeRes?.count ?? 0) > 0) {
          throw new ApiError(
            400,
            "ACTIVE_RESERVATION",
            `Aset ${asset.assetCode} memiliki unit dengan reservasi aktif.`,
          );
        }

        await tx
          .delete(reservation)
          .where(inArray(reservation.toolUnitId, unitIds));
        await tx
          .delete(toolRequestItem)
          .where(inArray(toolRequestItem.toolUnitId, unitIds));
        await tx
          .update(issueTransaction)
          .set({ toolUnitId: null })
          .where(inArray(issueTransaction.toolUnitId, unitIds));
        await tx
          .update(stockOpnameEntry)
          .set({ toolUnitId: null })
          .where(inArray(stockOpnameEntry.toolUnitId, unitIds));
        await tx
          .delete(toolConditionHistory)
          .where(inArray(toolConditionHistory.toolUnitId, unitIds));
        await tx
          .delete(toolUnit)
          .where(inArray(toolUnit.id, unitIds));
      }

      await tx
        .delete(reservation)
        .where(eq(reservation.toolAssetId, asset.id));
      await tx
        .delete(toolRequestItem)
        .where(eq(toolRequestItem.toolAssetId, asset.id));
      await tx
        .delete(returnTransaction)
        .where(eq(returnTransaction.toolAssetId, asset.id));
      await tx
        .update(issueTransaction)
        .set({ toolAssetId: null })
        .where(eq(issueTransaction.toolAssetId, asset.id));
      await tx
        .update(stockOpnameEntry)
        .set({ toolAssetId: null })
        .where(eq(stockOpnameEntry.toolAssetId, asset.id));
      await tx
        .update(incident)
        .set({ toolAssetId: null })
        .where(eq(incident.toolAssetId, asset.id));
      await tx
        .delete(toolConditionHistory)
        .where(eq(toolConditionHistory.toolAssetId, asset.id));
      await tx
        .delete(toolAsset)
        .where(eq(toolAsset.id, asset.id));

      const remainingAssets = await tx
        .select({ count: count() })
        .from(toolAsset)
        .where(eq(toolAsset.toolTypeId, asset.typeId));

      if (Number(remainingAssets[0]?.count ?? 0) === 0) {
        await tx
          .delete(toolType)
          .where(eq(toolType.id, asset.typeId));
      }

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "tool_asset",
        entityId: asset.id,
        before: {
          assetCode: asset.assetCode,
          roomCode: asset.roomCode,
        },
      });

      return { success: true, assetCode: asset.assetCode };
    }
  });
}

export async function deletePlpEquipmentType(
  actorId: string,
  scope: RoomScope,
  typeId: string,
) {
  if (!scope.all && scope.roomCodes.length === 0) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Anda belum memiliki penugasan laboratorium aktif.",
    );
  }
  return db.transaction(async (tx) => {
    const [insType] = await tx
      .select()
      .from(instrumentType)
      .where(eq(instrumentType.id, typeId))
      .limit(1);

    const eqType = insType
      ? { ...insType, kind: "INSTRUMENT" as const }
      : await tx
          .select()
          .from(toolType)
          .where(eq(toolType.id, typeId))
          .limit(1)
          .then((rows) =>
            rows[0] ? { ...rows[0], kind: "TOOL" as const } : null,
          );

    if (!eqType) {
      throw new ApiError(404, "NOT_FOUND", "Katalog peralatan tidak ditemukan.");
    }

    if (eqType.kind === "INSTRUMENT") {
      const assets = await tx
        .select({ id: instrumentAsset.id, assetCode: instrumentAsset.assetCode })
        .from(instrumentAsset)
        .where(eq(instrumentAsset.instrumentTypeId, typeId));

      if (assets.length > 0) {
        throw new ApiError(
          400,
          "HAS_ACTIVE_ASSETS",
          `Katalog "${eqType.name}" masih memiliki ${assets.length} aset terdaftar (${assets.map((a) => a.assetCode).join(", ")}). Hapus aset terlebih dahulu.`,
        );
      }

      await tx.delete(instrumentType).where(eq(instrumentType.id, typeId));

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "instrument_type",
        entityId: eqType.id,
        before: { name: eqType.name, classification: "INSTRUMENT" },
      });

      return { success: true, name: eqType.name };
    } else {
      const assets = await tx
        .select({ id: toolAsset.id, assetCode: toolAsset.assetCode })
        .from(toolAsset)
        .where(eq(toolAsset.toolTypeId, typeId));

      if (assets.length > 0) {
        throw new ApiError(
          400,
          "HAS_ACTIVE_ASSETS",
          `Katalog "${eqType.name}" masih memiliki ${assets.length} aset terdaftar (${assets.map((a) => a.assetCode).join(", ")}). Hapus aset terlebih dahulu.`,
        );
      }

      await tx.delete(toolType).where(eq(toolType.id, typeId));

      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "tool_type",
        entityId: eqType.id,
        before: { name: eqType.name, classification: "TOOL" },
      });

      return { success: true, name: eqType.name };
    }
  });
}

export async function deletePlpMaterialBatch(
  actorId: string,
  scope: RoomScope,
  batchId: string,
) {
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .select({
        id: materialBatch.id,
        lotNumber: materialBatch.lotNumber,
        materialId: materialBatch.materialId,
        materialCode: material.code,
        materialName: material.name,
        roomCode: room.code,
        quantity: materialBatch.quantity,
      })
      .from(materialBatch)
      .innerJoin(room, eq(room.id, materialBatch.roomId))
      .innerJoin(material, eq(material.id, materialBatch.materialId))
      .where(eq(materialBatch.id, batchId))
      .limit(1);

    if (!batch) {
      throw new ApiError(404, "NOT_FOUND", "Batch bahan kimia tidak ditemukan.");
    }

    assertRoomInScope(scope, batch.roomCode);

    const [reservedRow] = await tx
      .select({
        reserved: sql<string>`COALESCE(SUM(CASE
          WHEN ${stockTransaction.type} = 'RESERVE' THEN ${stockTransaction.quantity}
          WHEN ${stockTransaction.type} IN ('RELEASE', 'ISSUE') THEN -${stockTransaction.quantity}
          ELSE 0
        END), 0)`,
      })
      .from(stockTransaction)
      .where(eq(stockTransaction.materialBatchId, batchId));

    if (Number(reservedRow?.reserved ?? 0) > 0) {
      throw new ApiError(
        400,
        "BATCH_RESERVED",
        `Batch ${batch.lotNumber ?? batch.id} memiliki reservasi aktif sebesar ${reservedRow?.reserved}. Batalkan pengajuan terkait sebelum menghapus batch.`,
      );
    }

    await tx.update(materialRequestItem).set({ allocatedBatchId: null }).where(eq(materialRequestItem.allocatedBatchId, batchId));
    await tx.update(issueTransaction).set({ materialBatchId: null }).where(eq(issueTransaction.materialBatchId, batchId));
    await tx.update(stockOpnameEntry).set({ materialBatchId: null }).where(eq(stockOpnameEntry.materialBatchId, batchId));
    await tx.delete(stockTransaction).where(eq(stockTransaction.materialBatchId, batchId));
    await tx.delete(materialBatch).where(eq(materialBatch.id, batchId));

    await writeAudit(tx, {
      actorId,
      action: "DELETE",
      entityType: "material_batch",
      entityId: batch.id,
      before: {
        lotNumber: batch.lotNumber,
        materialCode: batch.materialCode,
        roomCode: batch.roomCode,
        quantity: batch.quantity,
      },
    });

    return { success: true, lotNumber: batch.lotNumber };
  });
}

export async function deletePlpMaterial(
  actorId: string,
  scope: RoomScope,
  code: string,
) {
  if (!scope.all && scope.roomCodes.length === 0) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Anda belum memiliki penugasan laboratorium aktif.",
    );
  }
  return db.transaction(async (tx) => {
    const [mat] = await tx
      .select()
      .from(material)
      .where(eq(material.code, code))
      .limit(1);

    if (!mat) {
      throw new ApiError(404, "NOT_FOUND", "Katalog bahan kimia tidak ditemukan.");
    }

    const batches = await tx
      .select({
        id: materialBatch.id,
        lotNumber: materialBatch.lotNumber,
        roomCode: room.code,
      })
      .from(materialBatch)
      .innerJoin(room, eq(room.id, materialBatch.roomId))
      .where(eq(materialBatch.materialId, mat.id));

    for (const batch of batches) {
      assertRoomInScope(scope, batch.roomCode);
    }

    const batchIds = batches.map((b) => b.id);
    if (batchIds.length > 0) {
      const [reservedRow] = await tx
        .select({
          reserved: sql<string>`COALESCE(SUM(CASE
            WHEN ${stockTransaction.type} = 'RESERVE' THEN ${stockTransaction.quantity}
            WHEN ${stockTransaction.type} IN ('RELEASE', 'ISSUE') THEN -${stockTransaction.quantity}
            ELSE 0
          END), 0)`,
        })
        .from(stockTransaction)
        .where(inArray(stockTransaction.materialBatchId, batchIds));

      if (Number(reservedRow?.reserved ?? 0) > 0) {
        throw new ApiError(
          400,
          "MATERIAL_RESERVED",
          `Bahan ${mat.name} (${mat.code}) memiliki batch dengan alokasi reservasi aktif. Selesaikan atau batalkan permohonan terlebih dahulu.`,
        );
      }

      await tx.update(materialRequestItem).set({ allocatedBatchId: null }).where(inArray(materialRequestItem.allocatedBatchId, batchIds));
      await tx.update(issueTransaction).set({ materialBatchId: null }).where(inArray(issueTransaction.materialBatchId, batchIds));
      await tx.update(stockOpnameEntry).set({ materialBatchId: null }).where(inArray(stockOpnameEntry.materialBatchId, batchIds));
      await tx.delete(stockTransaction).where(inArray(stockTransaction.materialBatchId, batchIds));
      await tx.delete(materialBatch).where(inArray(materialBatch.id, batchIds));
    }

    await tx.delete(materialDispensingRule).where(eq(materialDispensingRule.materialId, mat.id));
    await tx.delete(materialRequestItem).where(eq(materialRequestItem.materialId, mat.id));
    await tx.delete(material).where(eq(material.id, mat.id));

    await writeAudit(tx, {
      actorId,
      action: "DELETE",
      entityType: "material",
      entityId: mat.id,
      before: {
        code: mat.code,
        name: mat.name,
        category: mat.category,
        baseUnit: mat.baseUnit,
      },
    });

    return { success: true, code: mat.code, name: mat.name };
  });
}

