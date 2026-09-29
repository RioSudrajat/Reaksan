import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { materialBatch, room, equipmentAsset } from "@/db/schema";
import {
  listMaterialRows,
  type MaterialAggregateRow,
  listRoomRows,
} from "@/services/catalog.service";
import { listBatchStock, stockTotalsForMaterial } from "@/services/stock.service";
import { getAppSettings } from "@/services/settings.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const JAKARTA = "Asia/Jakarta";

export type TrendGroup = {
  key: string;
  label: string;
  tone: "yellow" | "blue" | "green" | "rose" | "amber" | "neutral";
};

const STATUS_GROUPS: { group: TrendGroup; statuses: string[] }[] = [
  {
    group: { key: "pending", label: "Menunggu review", tone: "blue" },
    statuses: ["SUBMITTED", "PENDING_PLP", "REQUEST_REVISION"],
  },
  {
    group: { key: "approved", label: "Disetujui", tone: "yellow" },
    statuses: ["APPROVED", "READY_FOR_PICKUP"],
  },
  {
    group: { key: "active", label: "Berjalan / overdue", tone: "green" },
    statuses: ["ACTIVE", "OVERDUE"],
  },
  {
    group: { key: "done", label: "Selesai", tone: "neutral" },
    statuses: ["COMPLETED", "RETURNED"],
  },
  {
    group: { key: "cancelled", label: "Ditolak / batal", tone: "rose" },
    statuses: ["REJECTED", "CANCELLED", "EXPIRED", "DRAFT"],
  },
];

const STATUS_TO_GROUP = new Map<string, string>(
  STATUS_GROUPS.flatMap(({ group, statuses }) =>
    statuses.map((status) => [status, group.key] as const),
  ),
);

function jakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "01";
  return { year: Number(pick("year")), month: Number(pick("month")), day: Number(pick("day")) };
}

function jakartaMidnight(date: Date) {
  const { year, month, day } = jakartaDateParts(date);
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+07:00`,
  );
}

function startOfJakartaWeek(date: Date) {
  const midnight = jakartaMidnight(date);
  const weekday = midnight.getUTCDay();
  const offset = (weekday + 6) % 7;
  return new Date(midnight.getTime() - offset * DAY_MS);
}

function shortDayLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type RequestTrendRange = 7 | 30 | 90;

export async function getRequestTrend(options: {
  days: RequestTrendRange;
  roomCode?: string;
}) {
  const to = new Date();
  const from = new Date(jakartaMidnight(to).getTime() - (options.days - 1) * DAY_MS);
  const result = await db.execute<{
    day: string;
    status: string;
    total: number;
  }>(sql`
    SELECT
      to_char(date_trunc('day', COALESCE(submitted_at, created_at) AT TIME ZONE ${JAKARTA}), 'YYYY-MM-DD') AS day,
      status::text AS status,
      COUNT(*)::int AS total
    FROM resource_request
    WHERE COALESCE(submitted_at, created_at) >= ${from}
      AND COALESCE(submitted_at, created_at) <= ${to}
      AND (${options.roomCode ?? null}::text IS NULL OR room_id = (SELECT id FROM room WHERE code = ${options.roomCode ?? null}))
    GROUP BY 1, 2
  `);

  const daily = new Map<string, Map<string, number>>();
  for (const row of result.rows) {
    const groupKey = STATUS_TO_GROUP.get(row.status);
    if (!groupKey) continue;
    const bucket = daily.get(row.day) ?? new Map<string, number>();
    bucket.set(groupKey, (bucket.get(groupKey) ?? 0) + Number(row.total));
    daily.set(row.day, bucket);
  }

  const bucketStarts: Date[] = [];
  if (options.days === 7) {
    for (let index = 0; index < 7; index += 1) {
      bucketStarts.push(new Date(from.getTime() + index * DAY_MS));
    }
  } else {
    let cursor = startOfJakartaWeek(from);
    while (cursor.getTime() <= to.getTime()) {
      bucketStarts.push(cursor);
      cursor = new Date(cursor.getTime() + 7 * DAY_MS);
    }
  }

  const buckets = bucketStarts.map((start, index) => {
    const end =
      options.days === 7
        ? new Date(start.getTime() + DAY_MS - 1)
        : new Date(start.getTime() + 7 * DAY_MS - 1);
    const totals: Record<string, number> = {};
    for (
      let cursor = start;
      cursor.getTime() <= end.getTime();
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      const key = dayKey(cursor);
      const bucket = daily.get(key);
      if (!bucket) continue;
      for (const [groupKey, value] of bucket) {
        totals[groupKey] = (totals[groupKey] ?? 0) + value;
      }
    }
    const rangeFrom = start;
    const rangeTo = new Date(Math.min(end.getTime(), to.getTime()));
    return {
      key: dayKey(start),
      label:
        options.days === 7
          ? shortDayLabel(start)
          : `${new Intl.DateTimeFormat("id-ID", { timeZone: JAKARTA, day: "numeric", month: "short" }).format(start)}`,
      sublabel:
        options.days === 7
          ? undefined
          : `s/d ${new Intl.DateTimeFormat("id-ID", { timeZone: JAKARTA, day: "numeric", month: "short" }).format(rangeTo)}`,
      href: `/plp/requests?from=${dayKey(rangeFrom)}&to=${dayKey(rangeTo)}`,
      segments: STATUS_GROUPS.map(({ group }) => ({
        key: group.key,
        label: group.label,
        value: totals[group.key] ?? 0,
        tone: group.tone,
      })),
      index,
    };
  });

  return {
    range: {
      from,
      to,
      days: options.days,
      label:
        options.days === 7
          ? "7 hari terakhir, per hari"
          : options.days === 30
            ? "30 hari terakhir, per minggu"
            : "90 hari terakhir, per minggu",
    },
    groups: STATUS_GROUPS.map(({ group }) => group),
    buckets,
    total: buckets.reduce(
      (sum, bucket) =>
        sum + bucket.segments.reduce((inner, segment) => inner + segment.value, 0),
      0,
    ),
  };
}

export async function getMaterialRiskByRoom() {
  const [settings, materialRows, roomRows] = await Promise.all([
    getAppSettings(),
    listMaterialRows(db),
    listRooms(),
  ]);
  const materialIds = materialRows.map((row) => row.id);
  const batches = materialIds.length
    ? await listBatchStock(db, materialIds)
    : [];
  const materialById = new Map(materialRows.map((row) => [row.id, row]));
  const roomById = new Map(roomRows.map((row) => [row.id, row]));
  const roomByCode = new Map(roomRows.map((row) => [row.code, row]));

  const riskByRoom = new Map<
    string,
    {
      roomId: string;
      roomCode: string;
      roomName: string;
      totalBatches: number;
      lowStockMaterials: number;
      expiredBatches: number;
      expiringBatches: number;
    }
  >();
  const now = Date.now();
  const soon = now + 30 * DAY_MS;
  const lowStockMaterials = new Map<string, boolean>();

  for (const row of materialRows as MaterialAggregateRow[]) {
    const roomRow = roomByCode.get(row.room_code ?? "");
    if (!roomRow) continue;
    const roomBatches = batches.filter((batch) => batch.roomId === roomRow.id);
    const totals = stockTotalsForMaterial(roomBatches, row.id);
    const minimum = row.minimum_quantity ? Number(row.minimum_quantity) : null;
    const threshold = minimum !== null ? minimum * settings.low_stock_ratio : 0;
    lowStockMaterials.set(
      `${row.id}:${roomRow.id}`,
      minimum !== null ? totals.available <= threshold : totals.available <= 0,
    );
  }

  for (const batch of batches) {
    const material = materialById.get(batch.materialId);
    const roomRow = roomById.get(batch.roomId);
    if (!material || !roomRow) continue;
    const entry =
      riskByRoom.get(batch.roomId) ??
      {
        roomId: batch.roomId,
        roomCode: roomRow.code,
        roomName: roomRow.name,
        totalBatches: 0,
        lowStockMaterials: 0,
        expiredBatches: 0,
        expiringBatches: 0,
      };
    entry.totalBatches += 1;
    if (lowStockMaterials.get(`${batch.materialId}:${batch.roomId}`))
      entry.lowStockMaterials += 1;
    const expiry = batch.expiryDate ? batch.expiryDate.getTime() : null;
    if (expiry !== null && expiry < now) entry.expiredBatches += 1;
    else if (expiry !== null && expiry <= soon) entry.expiringBatches += 1;
    riskByRoom.set(batch.roomId, entry);
  }

  const rows = [...riskByRoom.values()]
    .map((entry) => ({
      ...entry,
      risk:
        entry.lowStockMaterials + entry.expiredBatches + entry.expiringBatches,
    }))
    .filter((entry) => entry.totalBatches > 0)
    .sort((a, b) => b.risk - a.risk || a.roomName.localeCompare(b.roomName));
  return { rows, thresholdDays: 30 };
}

async function listRooms() {
  return listRoomRows(db);
}

export async function getEquipmentRoomDistribution() {
  const rows = await db
    .select({
      roomCode: room.code,
      roomName: room.name,
      total: sql<number>`COUNT(*)::int`,
      available: sql<number>`COUNT(*) FILTER (WHERE ${equipmentAsset.status} = 'AVAILABLE')::int`,
      reserved: sql<number>`COUNT(*) FILTER (WHERE ${equipmentAsset.status} IN ('RESERVED', 'IN_USE'))::int`,
      attention: sql<number>`COUNT(*) FILTER (WHERE ${equipmentAsset.status} IN ('MAINTENANCE', 'DAMAGED', 'UNDER_INSPECTION'))::int`,
      retired: sql<number>`COUNT(*) FILTER (WHERE ${equipmentAsset.status} = 'RETIRED')::int`,
    })
    .from(equipmentAsset)
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(eq(equipmentAsset.active, true))
    .groupBy(room.id)
    .orderBy(asc(room.name));

  return {
    groups: [
      { key: "available", label: "Tersedia", tone: "green" as const },
      { key: "reserved", label: "Dipesan / dipakai", tone: "blue" as const },
      { key: "attention", label: "Perlu perhatian", tone: "rose" as const },
      { key: "retired", label: "Pensiun", tone: "neutral" as const },
    ],
    buckets: rows.map((row) => ({
      key: row.roomCode,
      label: row.roomName,
      href: `/plp/inventory/equipment?room=${encodeURIComponent(row.roomCode)}`,
      segments: [
        { key: "available", label: "Tersedia", value: row.available, tone: "green" as const },
        { key: "reserved", label: "Dipesan / dipakai", value: row.reserved, tone: "blue" as const },
        { key: "attention", label: "Perlu perhatian", value: row.attention, tone: "rose" as const },
        { key: "retired", label: "Pensiun", value: row.retired, tone: "neutral" as const },
      ],
    })),
  };
}

export async function getExpiryTrend(weeks = 8) {
  const rows = await db
    .select({
      batchId: materialBatch.id,
      expiryDate: materialBatch.expiryDate,
    })
    .from(materialBatch)
    .where(and(eq(materialBatch.active, true), ne(materialBatch.quantity, "0")))
    .orderBy(asc(materialBatch.expiryDate));

  const now = new Date();
  const weekStart = startOfJakartaWeek(now);
  const buckets: {
    key: string;
    label: string;
    sublabel?: string;
    href: string;
    segments: {
      key: string;
      label: string;
      value: number;
      tone: "rose" | "yellow" | "amber" | "neutral";
    }[];
  }[] = [];

  const overdue = rows.filter(
    (row) => row.expiryDate && row.expiryDate.getTime() < weekStart.getTime(),
  ).length;
  buckets.push({
    key: "overdue",
    label: "Terlewat",
    sublabel: "sebelum minggu ini",
    href: "/plp/inventory/materials",
    segments: [
      { key: "overdue", label: "Batch terlewat expiry", value: overdue, tone: "rose" },
    ],
  });

  for (let index = 0; index < weeks; index += 1) {
    const start = new Date(weekStart.getTime() + index * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const value = rows.filter(
      (row) =>
        row.expiryDate &&
        row.expiryDate.getTime() >= start.getTime() &&
        row.expiryDate.getTime() < end.getTime(),
    ).length;
    buckets.push({
      key: dayKey(start),
      label: `${new Intl.DateTimeFormat("id-ID", { timeZone: JAKARTA, day: "numeric", month: "short" }).format(start)}`,
      sublabel: `s/d ${new Intl.DateTimeFormat("id-ID", { timeZone: JAKARTA, day: "numeric", month: "short" }).format(end)}`,
      href: "/plp/inventory/materials?expiry=soon",
      segments: [
        {
          key: "expiring",
          label: "Batch segera expiry",
          value,
          tone: index < 5 ? "yellow" : "amber",
        },
      ],
    });
  }

  const laterStart = new Date(weekStart.getTime() + weeks * 7 * DAY_MS);
  const later = rows.filter(
    (row) => row.expiryDate && row.expiryDate.getTime() >= laterStart.getTime(),
  ).length;
  buckets.push({
    key: "later",
    label: "Setelah itu",
    sublabel: "di luar 8 minggu",
    href: "/plp/inventory/materials",
    segments: [
      { key: "later", label: "Batch dengan expiry jauh", value: later, tone: "neutral" },
    ],
  });

  const withExpiry = rows.filter((row) => row.expiryDate).length;
  const nearTerm = buckets
    .filter((bucket) => bucket.key !== "later")
    .reduce(
      (sum, bucket) =>
        sum + bucket.segments.reduce((inner, segment) => inner + segment.value, 0),
      0,
    );

  return {
    range: { from: weekStart, to: laterStart },
    buckets,
    overdue,
    withExpiry,
    nearTerm,
  };
}

export async function countActiveAssignments() {
  const result = await db.execute<{ value: number }>(sql`
    SELECT COUNT(*)::int AS value FROM assignment WHERE active = true
  `);
  return result.rows[0]?.value ?? 0;
}

export async function getInventoryHealth(days = 30) {
  const [settings, materialRows, roomRows] = await Promise.all([
    getAppSettings(),
    listMaterialRows(db),
    listRooms(),
  ]);
  const materialIds = [...new Set(materialRows.map((row) => row.id))];
  const batches = materialIds.length
    ? await listBatchStock(db, materialIds)
    : [];
  const roomByCode = new Map(roomRows.map((row) => [row.code, row.id]));
  const now = Date.now();
  const soon = now + days * DAY_MS;

  let lowStock = 0;
  for (const row of materialRows) {
    const roomId = roomByCode.get(row.room_code ?? "");
    if (!roomId) continue;
    const totals = stockTotalsForMaterial(
      batches.filter((batch) => batch.roomId === roomId),
      row.id,
    );
    const minimum = row.minimum_quantity ? Number(row.minimum_quantity) : null;
    const threshold = minimum !== null ? minimum * settings.low_stock_ratio : 0;
    const low =
      minimum !== null ? totals.available <= threshold : totals.available <= 0;
    if (low) lowStock += 1;
  }

  let expired = 0;
  let expiring = 0;
  for (const batch of batches) {
    const expiry = batch.expiryDate ? batch.expiryDate.getTime() : null;
    if (expiry === null) continue;
    if (expiry < now) expired += 1;
    else if (expiry <= soon) expiring += 1;
  }

  return { lowStock, expired, expiring };
}
