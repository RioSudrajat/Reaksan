import "server-only";
import type { CSSProperties } from "react";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  equipmentAsset,
  equipmentType,
  equipmentUnit,
  material,
  room,
  reservation,
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { stockTotalsForMaterial, listBatchStock } from "@/services/stock.service";
import { formatShortRangeLabel } from "@/components/schedule-data";
import type {
  EquipmentUnitStatus,
  EquipmentUnitView,
  EquipmentView,
  LabCatalog,
  MaterialView,
  RoomView,
  ScheduleTone,
} from "@/components/schedule-data";

type EquipmentStatus =
  (typeof equipmentUnit.$inferSelect)["status"];

const toneValues: ScheduleTone[] = ["blue", "green", "yellow", "rose", "cream"];

export function asTone(value: string | null | undefined): ScheduleTone {
  return toneValues.includes(value as ScheduleTone)
    ? (value as ScheduleTone)
    : "cream";
}

export function equipmentStatusView(status: EquipmentStatus): EquipmentUnitStatus {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "RESERVED":
      return "Reserved";
    case "IN_USE":
      return "In use";
    case "UNDER_INSPECTION":
      return "Awaiting return";
    default:
      return "Maintenance";
  }
}

function shortDate(date: Date | null) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function dayNumber(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      day: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date),
  );
}

export async function findRoomByCode(exec: DbExecutor, code: string) {
  const [row] = await exec
    .select()
    .from(room)
    .where(and(eq(room.code, code), eq(room.active, true)))
    .limit(1);
  return row;
}

export async function findUnitsByCodes(exec: DbExecutor, codes: string[]) {
  if (codes.length === 0) return [];
  return exec
    .select({
      unitId: equipmentUnit.id,
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      unitStatus: equipmentUnit.status,
      unitActive: equipmentUnit.active,
      assetId: equipmentAsset.id,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      assetStatus: equipmentAsset.status,
      assetCondition: equipmentAsset.condition,
      roomId: equipmentAsset.roomId,
      roomCode: room.code,
      roomName: room.name,
    })
    .from(equipmentUnit)
    .innerJoin(equipmentAsset, eq(equipmentAsset.id, equipmentUnit.equipmentAssetId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .where(inArray(equipmentUnit.code, codes));
}

export async function findMaterialsByCodes(exec: DbExecutor, codes: string[]) {
  if (codes.length === 0) return [];
  return exec
    .select({
      materialId: material.id,
      materialCode: material.code,
      name: material.name,
      category: material.category,
      baseUnit: material.baseUnit,
      active: material.active,
    })
    .from(material)
    .where(inArray(material.code, codes));
}

type RoomAggregateRow = {
  id: string;
  code: string;
  name: string;
  short_name: string;
  description: string | null;
  tone: string;
  type_count: number;
  total_units: number;
  available_units: number;
  reserved_units: number;
  in_use_units: number;
  awaiting_return_units: number;
  maintenance_units: number;
};

export async function listRoomRows(exec: DbExecutor) {
  const result = await exec.execute<RoomAggregateRow>(sql`
    SELECT
      r.id, r.code, r.name, r.short_name, r.description, r.tone,
      COUNT(DISTINCT a.id) FILTER (WHERE a.active)::int AS type_count,
      COUNT(u.id) FILTER (WHERE a.active AND u.active)::int AS total_units,
      COUNT(u.id) FILTER (WHERE a.active AND u.active AND u.status = 'AVAILABLE')::int AS available_units,
      COUNT(u.id) FILTER (WHERE a.active AND u.active AND u.status = 'RESERVED')::int AS reserved_units,
      COUNT(u.id) FILTER (WHERE a.active AND u.active AND u.status = 'IN_USE')::int AS in_use_units,
      COUNT(u.id) FILTER (WHERE a.active AND u.active AND u.status = 'UNDER_INSPECTION')::int AS awaiting_return_units,
      COUNT(u.id) FILTER (WHERE a.active AND u.active AND u.status IN ('MAINTENANCE', 'DAMAGED', 'RETIRED'))::int AS maintenance_units
    FROM room r
    LEFT JOIN equipment_asset a ON a.room_id = r.id AND a.active
    LEFT JOIN equipment_unit u ON u.equipment_asset_id = a.id AND u.active
    WHERE r.active
    GROUP BY r.id
    ORDER BY r.created_at ASC
  `);
  return result.rows;
}

export type MaterialAggregateRow = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  base_unit: string;
  room_code: string | null;
  room_name: string | null;
  image_media_id: string | null;
  minimum_quantity: string | null;
  dispensing_increment: string | null;
  maximum_quantity: string | null;
  rule_unit: string | null;
  physical: string;
  reserved: string;
  // Raw SQL rows can arrive as a Date or an ISO string depending on the driver.
  nearest_expiry: Date | string | null;
};

export async function listMaterialRows(
  exec: DbExecutor,
  options: { roomCode?: string; roomCodes?: string[] | null } = {},
) {
  const roomCode = options.roomCode ?? null;
  const roomCodes = options.roomCodes ?? null;
  // Inventory is owned per lab, so rows are grouped by material and lab.
  // `roomCodes` carries an assigned-lab scope; null means no scope filter.
  const scopeCondition =
    roomCodes === null
      ? sql`true`
      : roomCodes.length === 0
        ? sql`false`
        : sql`r.code IN (${sql.join(roomCodes.map((code) => sql`${code}`), sql`, `)})`;
  const result = await exec.execute<MaterialAggregateRow>(sql`
    SELECT
      m.id, m.code, m.name, m.category, m.base_unit, m.image_media_id,
      r.code AS room_code, r.name AS room_name,
      MIN(rule.minimum_quantity) AS minimum_quantity,
      MIN(rule.dispensing_increment) AS dispensing_increment,
      MIN(rule.maximum_quantity) AS maximum_quantity,
      MIN(rule.unit) AS rule_unit,
      COALESCE(SUM(b.quantity) FILTER (WHERE b.active), 0) AS physical,
      COALESCE(SUM(COALESCE(t.reserved, 0)) FILTER (WHERE b.active), 0) AS reserved,
      MIN(b.expiry_date) FILTER (WHERE b.active AND b.expiry_date IS NOT NULL) AS nearest_expiry
    FROM material m
    LEFT JOIN material_batch b ON b.material_id = m.id
    LEFT JOIN room r ON r.id = b.room_id
    LEFT JOIN (
      SELECT material_batch_id,
        SUM(CASE
          WHEN type = 'RESERVE' THEN quantity
          WHEN type IN ('RELEASE', 'ISSUE') THEN -quantity
          ELSE 0
        END) AS reserved
      FROM stock_transaction
      GROUP BY material_batch_id
    ) t ON t.material_batch_id = b.id
    LEFT JOIN material_dispensing_rule rule ON rule.material_id = m.id AND rule.active
    WHERE m.active
      AND (${roomCode}::text IS NULL OR r.code = ${roomCode})
      AND ${scopeCondition}
    GROUP BY m.id, r.code, r.name
    HAVING (${roomCode}::text IS NULL OR COUNT(b.id) > 0)
      AND ${scopeCondition}
    ORDER BY m.name ASC, r.name ASC
  `);
  return result.rows;
}

export function materialStockSummary(row: MaterialAggregateRow) {
  const physical = Number(row.physical);
  const reserved = Math.max(0, Number(row.reserved));
  return { physical, reserved, available: Math.max(0, physical - reserved) };
}

export function dispensingOptions(
  row: Pick<
    MaterialAggregateRow,
    "minimum_quantity" | "dispensing_increment" | "maximum_quantity"
  >,
  available: number,
) {
  if (!row.minimum_quantity || !row.dispensing_increment || !row.maximum_quantity) {
    return [];
  }
  const minimum = Number(row.minimum_quantity);
  const increment = Number(row.dispensing_increment);
  const maximum = Number(row.maximum_quantity);
  if (increment <= 0) return [];
  const ceiling = Math.min(maximum, available);
  const options: number[] = [];
  for (let value = minimum; value <= ceiling + 1e-9; value += increment) {
    options.push(Math.round(value * 1000) / 1000);
    if (options.length > 60) break;
  }
  return options;
}

export function dispensingRuleLabel(row: MaterialAggregateRow) {
  if (!row.minimum_quantity || !row.dispensing_increment) return "No dispensing rule";
  const unit = row.rule_unit ?? row.base_unit;
  return `${Number(row.minimum_quantity)} ${unit} minimum · ${Number(row.dispensing_increment)} ${unit} increment · ${Number(row.maximum_quantity)} ${unit} maximum`;
}

export function materialTone(available: number, minimum: number | null) {
  if (available <= 0) return "rose" as ScheduleTone;
  if (minimum !== null && available < minimum * 2) return "yellow" as ScheduleTone;
  return "green" as ScheduleTone;
}

type UnitRow = {
  unitId: string;
  unitCode: string;
  unitLabel: string;
  unitStatus: EquipmentStatus;
  condition: string;
  assetId: string;
  notes: string | null;
};

type ActiveReservationRow = {
  unitId: string;
  startAt: Date;
  endAt: Date;
  status: "RESERVED" | "ACTIVE";
  actorName: string;
};

export async function listActiveReservationsForUnits(
  exec: DbExecutor,
  unitIds: string[],
) {
  if (unitIds.length === 0) return [];
  const rows = await exec
    .select({
      unitId: reservation.equipmentUnitId,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      status: reservation.status,
      actorName: user.name,
    })
    .from(reservation)
    .innerJoin(user, eq(user.id, reservation.primaryUserId))
    .where(
      and(
        inArray(reservation.equipmentUnitId, unitIds),
        inArray(reservation.status, ["RESERVED", "ACTIVE"]),
      ),
    )
    .orderBy(asc(reservation.startAt));
  return rows.filter(
    (row): row is ActiveReservationRow =>
      row.status === "RESERVED" || row.status === "ACTIVE",
  );
}

function holderLabel(
  unit: { unitStatus: EquipmentStatus; notes: string | null },
  reservations: ActiveReservationRow[],
  now: Date,
) {
  const running = reservations.find(
    (row) => row.startAt <= now && row.endAt >= now,
  );
  const upcoming = reservations.find((row) => row.startAt > now);
  const relevant = running ?? upcoming;
  if (relevant) {
    return `${relevant.actorName} · ${formatShortRangeLabel({
      start: dayNumber(relevant.startAt),
      end: dayNumber(relevant.endAt),
    })}`;
  }
  if (unit.unitStatus === "MAINTENANCE" || unit.unitStatus === "DAMAGED") {
    return unit.notes ?? "Maintenance";
  }
  if (unit.unitStatus === "UNDER_INSPECTION") {
    return "Returned · menunggu inspeksi";
  }
  return undefined;
}

type AssetRow = {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetStatus: (typeof equipmentAsset.$inferSelect)["status"];
  assetCondition: (typeof equipmentAsset.$inferSelect)["condition"];
  notes: string | null;
  typeName: string;
  usageType: (typeof equipmentType.$inferSelect)["usageType"];
  assetImageMediaId: string | null;
  typeImageMediaId: string | null;
  roomId: string;
  roomCode: string;
  roomName: string;
  roomTone: string;
};

export async function listAssetRows(
  exec: DbExecutor,
  options: { roomCode?: string } = {},
) {
  return exec
    .select({
      assetId: equipmentAsset.id,
      assetCode: equipmentAsset.assetCode,
      assetName: equipmentType.name,
      assetStatus: equipmentAsset.status,
      assetCondition: equipmentAsset.condition,
      notes: equipmentAsset.notes,
      typeName: equipmentType.name,
      usageType: equipmentType.usageType,
      assetImageMediaId: equipmentAsset.imageMediaId,
      typeImageMediaId: equipmentType.imageMediaId,
      roomId: equipmentAsset.roomId,
      roomCode: room.code,
      roomName: room.name,
      roomTone: room.tone,
    })
    .from(equipmentAsset)
    .innerJoin(equipmentType, eq(equipmentType.id, equipmentAsset.equipmentTypeId))
    .innerJoin(room, eq(room.id, equipmentAsset.roomId))
    .where(
      and(
        eq(equipmentAsset.active, true),
        options.roomCode ? eq(room.code, options.roomCode) : undefined,
      ),
    )
    .orderBy(asc(equipmentAsset.assetCode));
}

function assetSummary(units: EquipmentUnitView[]) {
  const count = (status: EquipmentUnitStatus) =>
    units.filter((unit) => unit.status === status).length;
  const availableUnits = count("Available");
  const reservedUnits = count("Reserved");
  const inUseUnits = count("In use");
  const awaitingReturnUnits = count("Awaiting return");
  const maintenanceUnits = count("Maintenance");
  const status: EquipmentUnitStatus =
    availableUnits > 0
      ? "Available"
      : awaitingReturnUnits > 0
        ? "Awaiting return"
        : inUseUnits > 0
          ? "In use"
          : "Maintenance";
  const tone: ScheduleTone =
    availableUnits > 0
      ? "green"
      : awaitingReturnUnits > 0
        ? "rose"
        : inUseUnits > 0
          ? "yellow"
          : "rose";
  return {
    availableUnits,
    reservedUnits,
    inUseUnits,
    awaitingReturnUnits,
    maintenanceUnits,
    totalUnits: units.length,
    status,
    tone,
  };
}

function toEquipmentViews(
  assets: AssetRow[],
  unitRows: UnitRow[],
  reservations: ActiveReservationRow[],
): EquipmentView[] {
  const now = new Date();
  return assets.map((asset) => {
    const rows = unitRows.filter((unit) => unit.assetId === asset.assetId);
    const units: EquipmentUnitView[] = rows.map((unit) => ({
      id: unit.unitCode,
      label: unit.unitLabel,
      status: equipmentStatusView(unit.unitStatus),
      condition: unit.condition,
      notes: unit.notes,
      holder: holderLabel(
        unit,
        reservations.filter((row) => row.unitId === unit.unitId),
        now,
      ),
    }));
    const summary = assetSummary(units);
    const nextEnd = reservations
      .filter(
        (row) =>
          rows.some((unit) => unit.unitId === row.unitId) && row.endAt >= now,
      )
      .map((row) => row.endAt)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const nextAvailable =
      summary.availableUnits > 0
        ? `Hari ini · ${shortDate(now)}`
        : nextEnd
          ? shortDate(nextEnd)
          : summary.maintenanceUnits > 0
            ? "Setelah inspeksi"
            : "No open window";
    return {
      id: asset.assetCode,
      name: asset.assetName,
      typeName: asset.typeName,
      roomId: asset.roomCode,
      room: asset.roomName,
      usage: asset.usageType === "BORROWABLE" ? "Borrowable" : "Usage only",
      condition:
        asset.assetCondition === "GOOD"
          ? "Good"
          : asset.assetCondition === "MINOR_ISSUE"
            ? "Inspection required"
            : asset.assetCondition === "DAMAGED"
              ? "Damaged"
              : "Unknown",
      meta: asset.notes ?? asset.typeName,
      nextAvailable,
      imageMediaId: asset.assetImageMediaId ?? asset.typeImageMediaId ?? null,
      ...summary,
      units,
    };
  });
}

type UnitQueryRow = {
  unitId: string;
  unitCode: string;
  unitLabel: string;
  unitStatus: EquipmentStatus;
  condition: string;
  assetId: string;
  notes: string | null;
};

export async function listUnitRows(
  exec: DbExecutor,
  assetIds: string[],
): Promise<UnitQueryRow[]> {
  if (assetIds.length === 0) return [];
  return exec
    .select({
      unitId: equipmentUnit.id,
      unitCode: equipmentUnit.code,
      unitLabel: equipmentUnit.label,
      unitStatus: equipmentUnit.status,
      condition: equipmentUnit.condition,
      assetId: equipmentUnit.equipmentAssetId,
      notes: equipmentUnit.notes,
    })
    .from(equipmentUnit)
    .where(
      and(
        inArray(equipmentUnit.equipmentAssetId, assetIds),
        eq(equipmentUnit.active, true),
      ),
    )
    .orderBy(asc(equipmentUnit.code));
}

export async function buildEquipmentViews(
  exec: DbExecutor,
  options: { roomCode?: string } = {},
): Promise<EquipmentView[]> {
  const assets = await listAssetRows(exec, options);
  const units = await listUnitRows(
    exec,
    assets.map((asset) => asset.assetId),
  );
  const reservations = await listActiveReservationsForUnits(
    exec,
    units.map((unit) => unit.unitId),
  );
  return toEquipmentViews(assets, units, reservations);
}

export async function buildMaterialViews(
  exec: DbExecutor,
  options: { roomCode?: string } = {},
): Promise<MaterialView[]> {
  const rows = await listMaterialRows(exec, options);
  return rows.map((row) => {
    const { physical, reserved, available } = materialStockSummary(row);
    const minimum = row.minimum_quantity ? Number(row.minimum_quantity) : null;
    return {
      id: row.code,
      name: row.name,
      category: row.category ?? "Material",
      roomId: row.room_code ?? "",
      room: row.room_name ?? "Penyimpanan lab",
      unit: row.rule_unit ?? row.base_unit,
      options: dispensingOptions(row, available),
      physical,
      reserved,
      available,
      rule: dispensingRuleLabel(row),
      tone: materialTone(available, minimum),
      expiry: row.nearest_expiry
        ? new Date(row.nearest_expiry).toISOString()
        : null,
      imageMediaId: row.image_media_id ?? null,
    };
  });
}

// Positions match the isometric floor plan drawn by the lab map component.
const roomPositions: Record<string, CSSProperties> = {
  "lab-organik": { left: "5%", top: "16%", width: "29%", height: "30%" },
  "lab-anorganik": { left: "39%", top: "12%", width: "35%", height: "34%" },
  "lab-biokimia": { left: "77%", top: "18%", width: "18%", height: "28%" },
  "lab-analitik": { left: "7%", top: "53%", width: "26%", height: "31%" },
  "lab-fisik": { left: "38%", top: "55%", width: "31%", height: "29%" },
};

export async function buildRoomViews(exec: DbExecutor): Promise<RoomView[]> {
  const rows = await listRoomRows(exec);
  return rows.map((row) => ({
    id: row.code,
    name: row.name,
    shortName: row.short_name,
    description: row.description ?? "",
    tone: asTone(row.tone),
    position: roomPositions[row.code] ?? {},
    equipment: row.total_units,
    available: row.available_units,
    reserved: row.reserved_units,
    inUse: row.in_use_units,
    awaitingReturn: row.awaiting_return_units,
    maintenance: row.maintenance_units,
    typeCount: row.type_count,
  }));
}

// Page-friendly wrapper for callers that do not manage a transaction.
export async function listRoomViews() {
  return buildRoomViews(db);
}

export async function buildLabCatalog(): Promise<LabCatalog> {
  const [rooms, equipment, materials] = await Promise.all([
    buildRoomViews(db),
    buildEquipmentViews(db),
    buildMaterialViews(db),
  ]);
  return { rooms, equipment, materials };
}

export async function buildRoomCatalog(roomCode: string) {
  const [roomRow, equipment, materials, roomRows] = await Promise.all([
    findRoomByCode(db, roomCode),
    buildEquipmentViews(db, { roomCode }),
    buildMaterialViews(db, { roomCode }),
    buildRoomViews(db),
  ]);
  const roomView = roomRows.find((item) => item.id === roomCode);
  return { room: roomRow, roomView, equipment, materials };
}

export async function buildMaterialStock(
  exec: DbExecutor,
  materialIds: string[],
) {
  const rows = await listBatchStock(exec, materialIds);
  return new Map(
    materialIds.map((id) => [id, stockTotalsForMaterial(rows, id)]),
  );
}
