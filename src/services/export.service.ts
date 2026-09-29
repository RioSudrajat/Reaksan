import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  auditLog,
  equipmentAsset,
  equipmentUnit,
  incident,
  incidentResolution,
  issueTransaction,
  material,
  materialBatch,
  resourceRequest,
  returnTransaction,
  room,
  stockOpnameEntry,
  stockOpnameSession,
  stockTransaction,
  user,
} from "@/db/schema";
import { toCsv, type CsvColumn } from "@/lib/csv";
import { auditRoomScopeSql } from "@/services/access-scope.service";
import { listPlpMaterials } from "@/services/plp.service";

const ROW_LIMIT = 5000;

// null = no scope filter; an empty array means nothing is visible.
function roomScopeCondition(roomCodes?: string[] | null) {
  if (roomCodes === undefined || roomCodes === null) return undefined;
  return roomCodes.length === 0 ? sql`false` : inArray(room.code, roomCodes);
}

const jakartaDateTime = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

function formatStamp(value: Date | string | null | undefined) {
  if (!value) return "";
  return jakartaDateTime.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

function today() {
  return jakartaDate.format(new Date());
}

function dayStart(value: string) {
  return new Date(`${value}T00:00:00+07:00`);
}

function dayEnd(value: string) {
  return new Date(`${value}T23:59:59.999+07:00`);
}

function csvResult(
  name: string,
  rows: Record<string, string | number | null | undefined>[],
  columns: CsvColumn[],
) {
  return { filename: `${name}-${today()}.csv`, csv: toCsv(rows, columns) };
}

export async function exportInventoryBatches(
  filters: {
    roomCode?: string;
    materialCode?: string;
    expiringBefore?: string;
  },
  roomCodes?: string[] | null,
) {
  const conditions = [];
  if (filters.roomCode) conditions.push(eq(room.code, filters.roomCode));
  if (filters.materialCode)
    conditions.push(eq(material.code, filters.materialCode));
  const scope = roomScopeCondition(roomCodes);
  if (scope) conditions.push(scope);
  if (filters.expiringBefore) {
    conditions.push(isNotNull(materialBatch.expiryDate));
    conditions.push(
      lte(materialBatch.expiryDate, dayEnd(filters.expiringBefore)),
    );
  }
  const rows = await db
    .select({
      materialCode: material.code,
      materialName: material.name,
      unit: material.baseUnit,
      roomCode: room.code,
      roomName: room.name,
      lotNumber: materialBatch.lotNumber,
      quantity: materialBatch.quantity,
      expiryDate: materialBatch.expiryDate,
      active: materialBatch.active,
    })
    .from(materialBatch)
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(room, eq(room.id, materialBatch.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(material.name), asc(materialBatch.expiryDate))
    .limit(ROW_LIMIT);
  return csvResult(
    "inventory-batch",
    rows.map((row) => ({
      materialCode: row.materialCode,
      materialName: row.materialName,
      unit: row.unit,
      room: `${row.roomCode} · ${row.roomName}`,
      lotNumber: row.lotNumber ?? "",
      quantity: Number(row.quantity),
      expiryDate: row.expiryDate ? row.expiryDate.toISOString() : "",
      active: row.active ? "aktif" : "nonaktif",
    })),
    [
      { key: "materialCode", label: "Kode material" },
      { key: "materialName", label: "Nama material" },
      { key: "unit", label: "Unit" },
      { key: "room", label: "Room" },
      { key: "lotNumber", label: "Lot" },
      { key: "quantity", label: "Jumlah" },
      { key: "expiryDate", label: "Kedaluwarsa" },
      { key: "active", label: "Status batch" },
    ],
  );
}

export async function exportLowStock(roomCodes?: string[] | null) {
  const page = await listPlpMaterials({
    stock: "all",
    limit: ROW_LIMIT,
    roomCodes,
  });
  const rows = page.data
    .map((row) => ({
      code: row.code,
      name: row.name,
      unit: row.unit,
      physical: row.physical,
      reserved: row.reserved,
      available: row.available,
      minimum: row.minimum ?? 0,
      status: row.lowStock || row.outOfStock ? "low" : "ok",
    }))
    .sort((a, b) =>
      a.status === b.status
        ? a.name.localeCompare(b.name)
        : a.status === "low"
          ? -1
          : 1,
    );
  return csvResult("stok-rendah", rows, [
    { key: "code", label: "Kode material" },
    { key: "name", label: "Nama material" },
    { key: "unit", label: "Unit" },
    { key: "physical", label: "Stok fisik" },
    { key: "reserved", label: "Reserved" },
    { key: "available", label: "Tersedia" },
    { key: "minimum", label: "Minimum" },
    { key: "status", label: "Status" },
  ]);
}

export async function exportStockTransactions(
  filters: {
    batchId?: string;
    materialCode?: string;
    from?: string;
    to?: string;
  },
  roomCodes?: string[] | null,
) {
  const conditions = [];
  if (filters.batchId)
    conditions.push(eq(stockTransaction.materialBatchId, filters.batchId));
  if (filters.materialCode)
    conditions.push(eq(material.code, filters.materialCode));
  const scope = roomScopeCondition(roomCodes);
  if (scope) conditions.push(scope);
  if (filters.from)
    conditions.push(gte(stockTransaction.createdAt, dayStart(filters.from)));
  if (filters.to)
    conditions.push(lte(stockTransaction.createdAt, dayEnd(filters.to)));
  const rows = await db
    .select({
      createdAt: stockTransaction.createdAt,
      materialCode: material.code,
      materialName: material.name,
      roomCode: room.code,
      lotNumber: materialBatch.lotNumber,
      type: stockTransaction.type,
      quantity: stockTransaction.quantity,
      beforeQuantity: stockTransaction.beforeQuantity,
      afterQuantity: stockTransaction.afterQuantity,
      actorName: user.name,
      reason: stockTransaction.reason,
    })
    .from(stockTransaction)
    .innerJoin(
      materialBatch,
      eq(materialBatch.id, stockTransaction.materialBatchId),
    )
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(room, eq(room.id, materialBatch.roomId))
    .leftJoin(user, eq(user.id, stockTransaction.performedById))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockTransaction.createdAt))
    .limit(ROW_LIMIT);
  return csvResult(
    "transaksi-stok",
    rows.map((row) => ({
      createdAt: formatStamp(row.createdAt),
      material: `${row.materialCode} · ${row.materialName}`,
      room: row.roomCode,
      lotNumber: row.lotNumber ?? "",
      type: row.type,
      quantity: Number(row.quantity),
      before: Number(row.beforeQuantity),
      after: Number(row.afterQuantity),
      actor: row.actorName ?? "Sistem",
      reason: row.reason ?? "",
    })),
    [
      { key: "createdAt", label: "Waktu" },
      { key: "material", label: "Material" },
      { key: "room", label: "Room" },
      { key: "lotNumber", label: "Lot" },
      { key: "type", label: "Tipe" },
      { key: "quantity", label: "Jumlah" },
      { key: "before", label: "Sebelum" },
      { key: "after", label: "Sesudah" },
      { key: "actor", label: "Aktor" },
      { key: "reason", label: "Catatan" },
    ],
  );
}

export async function exportIssueReturn(
  filters: {
    requestCode?: string;
    from?: string;
    to?: string;
  },
  roomCodes?: string[] | null,
) {
  const issuedTo = alias(user, "issue_recipient");
  const conditions = [];
  if (filters.requestCode)
    conditions.push(eq(resourceRequest.code, filters.requestCode));
  const scope = roomScopeCondition(roomCodes);
  if (scope) conditions.push(scope);
  if (filters.from)
    conditions.push(gte(issueTransaction.issuedAt, dayStart(filters.from)));
  if (filters.to)
    conditions.push(lte(issueTransaction.issuedAt, dayEnd(filters.to)));
  const rows = await db
    .select({
      requestCode: resourceRequest.code,
      studentName: issuedTo.name,
      unitCode: equipmentUnit.code,
      assetCode: equipmentAsset.assetCode,
      materialName: material.name,
      lotNumber: materialBatch.lotNumber,
      quantity: issueTransaction.quantity,
      conditionAtIssue: issueTransaction.conditionAtIssue,
      issuedAt: issueTransaction.issuedAt,
      returnedAt: returnTransaction.returnedAt,
      conditionAtReturn: returnTransaction.conditionAtReturn,
    })
    .from(issueTransaction)
    .innerJoin(
      resourceRequest,
      eq(resourceRequest.id, issueTransaction.requestId),
    )
    .innerJoin(room, eq(room.id, resourceRequest.roomId))
    .innerJoin(issuedTo, eq(issuedTo.id, issueTransaction.issuedToId))
    .leftJoin(
      equipmentUnit,
      eq(equipmentUnit.id, issueTransaction.equipmentUnitId),
    )
    .leftJoin(
      equipmentAsset,
      eq(equipmentAsset.id, issueTransaction.equipmentAssetId),
    )
    .leftJoin(
      materialBatch,
      eq(materialBatch.id, issueTransaction.materialBatchId),
    )
    .leftJoin(material, eq(material.id, materialBatch.materialId))
    .leftJoin(
      returnTransaction,
      eq(returnTransaction.issueTransactionId, issueTransaction.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(issueTransaction.issuedAt))
    .limit(ROW_LIMIT);
  return csvResult(
    "issue-return",
    rows.map((row) => {
      const resource = row.unitCode
        ? `${row.assetCode ?? ""} / ${row.unitCode}`.trim()
        : row.materialName
          ? `${row.materialName}${row.lotNumber ? ` (${row.lotNumber})` : ""}`
          : "-";
      return {
        requestCode: row.requestCode,
        student: row.studentName,
        resource,
        quantity: row.quantity === null ? "" : Number(row.quantity),
        conditionAtIssue: row.conditionAtIssue ?? "",
        issuedAt: formatStamp(row.issuedAt),
        returnedAt: formatStamp(row.returnedAt),
        conditionAtReturn: row.conditionAtReturn ?? "",
      };
    }),
    [
      { key: "requestCode", label: "Kode request" },
      { key: "student", label: "Mahasiswa" },
      { key: "resource", label: "Aset/unit atau material/lot" },
      { key: "quantity", label: "Jumlah" },
      { key: "conditionAtIssue", label: "Kondisi saat issue" },
      { key: "issuedAt", label: "Waktu issue" },
      { key: "returnedAt", label: "Waktu return" },
      { key: "conditionAtReturn", label: "Kondisi saat return" },
    ],
  );
}

export async function exportIncidents(
  filters: {
    status?: string;
    severity?: string;
    from?: string;
    to?: string;
  },
  roomCodes?: string[] | null,
) {
  const conditions = [];
  if (filters.status)
    conditions.push(sql`${incident.status}::text = ${filters.status}`);
  if (filters.severity)
    conditions.push(sql`${incident.severity}::text = ${filters.severity}`);
  const scope = roomScopeCondition(roomCodes);
  if (scope) conditions.push(scope);
  if (filters.from)
    conditions.push(
      gte(
        sql`COALESCE(${incident.occurredAt}, ${incident.createdAt})`,
        dayStart(filters.from),
      ),
    );
  if (filters.to)
    conditions.push(
      lte(
        sql`COALESCE(${incident.occurredAt}, ${incident.createdAt})`,
        dayEnd(filters.to),
      ),
    );
  const rows = await db
    .select({
      code: incident.code,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      reporterName: user.name,
      assetCode: equipmentAsset.assetCode,
      roomName: room.name,
      occurredAt: incident.occurredAt,
      resolvedAt: incidentResolution.resolvedAt,
    })
    .from(incident)
    .innerJoin(user, eq(user.id, incident.reporterId))
    .leftJoin(equipmentAsset, eq(equipmentAsset.id, incident.equipmentAssetId))
    .leftJoin(room, eq(room.id, incident.roomId))
    .leftJoin(
      incidentResolution,
      eq(incidentResolution.incidentId, incident.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(incident.createdAt))
    .limit(ROW_LIMIT);
  return csvResult(
    "insiden",
    rows.map((row) => ({
      code: row.code,
      title: row.title,
      severity: row.severity,
      status: row.status,
      reporter: row.reporterName,
      asset: row.assetCode ?? "",
      room: row.roomName ?? "",
      occurredAt: formatStamp(row.occurredAt),
      resolvedAt: formatStamp(row.resolvedAt),
    })),
    [
      { key: "code", label: "Kode" },
      { key: "title", label: "Judul" },
      { key: "severity", label: "Severity" },
      { key: "status", label: "Status" },
      { key: "reporter", label: "Pelapor" },
      { key: "asset", label: "Aset" },
      { key: "room", label: "Room" },
      { key: "occurredAt", label: "Terjadi" },
      { key: "resolvedAt", label: "Selesai" },
    ],
  );
}

export async function exportAudit(
  filters: {
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
  },
  roomCodes?: string[] | null,
) {
  const conditions = [];
  if (filters.entityType)
    conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.action)
    conditions.push(sql`${auditLog.action}::text = ${filters.action}`);
  if (roomCodes !== undefined) {
    conditions.push(
      roomCodes === null
        ? sql`true`
        : roomCodes.length === 0
          ? sql`false`
          : auditRoomScopeSql(roomCodes),
    );
  }
  if (filters.from)
    conditions.push(gte(auditLog.createdAt, dayStart(filters.from)));
  if (filters.to) conditions.push(lte(auditLog.createdAt, dayEnd(filters.to)));
  const rows = await db
    .select({
      createdAt: auditLog.createdAt,
      actorName: user.name,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      reason: auditLog.reason,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(ROW_LIMIT);
  return csvResult(
    "audit",
    rows.map((row) => ({
      createdAt: formatStamp(row.createdAt),
      actor: row.actorName ?? "Sistem",
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      reason: row.reason ?? "",
    })),
    [
      { key: "createdAt", label: "Waktu" },
      { key: "actor", label: "Aktor" },
      { key: "action", label: "Action" },
      { key: "entityType", label: "Entity" },
      { key: "entityId", label: "Entity id" },
      { key: "reason", label: "Catatan" },
    ],
  );
}

export async function exportOpnameVariance(sessionId: string) {
  const [session] = await db
    .select({ id: stockOpnameSession.id })
    .from(stockOpnameSession)
    .where(eq(stockOpnameSession.id, sessionId))
    .limit(1);
  if (!session)
    throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
  const rows = await db
    .select({
      materialCode: material.code,
      materialName: material.name,
      lotNumber: materialBatch.lotNumber,
      unit: material.baseUnit,
      baselineQuantity: stockOpnameEntry.baselineQuantity,
      countedQuantity: stockOpnameEntry.countedQuantity,
      countedByName: user.name,
      countedAt: stockOpnameEntry.countedAt,
    })
    .from(stockOpnameEntry)
    .innerJoin(
      materialBatch,
      eq(materialBatch.id, stockOpnameEntry.materialBatchId),
    )
    .innerJoin(material, eq(material.id, materialBatch.materialId))
    .innerJoin(user, eq(user.id, stockOpnameEntry.countedById))
    .where(eq(stockOpnameEntry.sessionId, sessionId))
    .orderBy(asc(material.name), asc(materialBatch.expiryDate))
    .limit(ROW_LIMIT);
  return csvResult(
    "selisih-opname",
    rows.map((row) => {
      const baseline = Number(row.baselineQuantity);
      const counted = Number(row.countedQuantity);
      return {
        material: `${row.materialCode} · ${row.materialName}`,
        lotNumber: row.lotNumber ?? "",
        unit: row.unit,
        baseline,
        counted,
        difference: counted - baseline,
        countedBy: row.countedByName,
        countedAt: formatStamp(row.countedAt),
      };
    }),
    [
      { key: "material", label: "Material" },
      { key: "lotNumber", label: "Lot" },
      { key: "unit", label: "Unit" },
      { key: "baseline", label: "Baseline" },
      { key: "counted", label: "Fisik" },
      { key: "difference", label: "Selisih" },
      { key: "countedBy", label: "Dihitung oleh" },
      { key: "countedAt", label: "Waktu hitung" },
    ],
  );
}
