import "server-only";
import { eq, sql, type SQL } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  auditLog,
  incident,
  resourceRequest,
  room,
  stockOpnameSession,
} from "@/db/schema";
import { ADMIN_ROLES } from "@/lib/permissions";

// Room-level scope for the operational workspace. Admins see every lab;
// everyone else only sees labs they are assigned to through the assignment
// table (ROOM scope, or LABORATORY scope which covers the lab's rooms).
export type RoomScope = { all: true } | { all: false; roomCodes: string[] };

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, { scope: RoomScope; expiresAt: number }>();

// Called by assignment writes so a scope change is visible immediately.
export function invalidateRoomScope(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export function isAdminRole(role: string | null | undefined) {
  const roles = (role ?? "")
    .split(",")
    .map((value) => value.trim());
  return roles.some((value) =>
    (ADMIN_ROLES as readonly string[]).includes(value),
  );
}

export async function getRoomScope(
  userId: string,
  role: string | null | undefined,
): Promise<RoomScope> {
  if (isAdminRole(role)) return { all: true };
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.scope;
  const result = await db.execute<{ code: string }>(sql`
    SELECT r.code AS code
    FROM assignment a
    JOIN room r ON r.code = a.scope_id
    WHERE a.user_id = ${userId}
      AND a.active
      AND a.scope_type = 'ROOM'
      AND a.assignment_type IN ('PLP', 'PIC')
      AND (a.start_date IS NULL OR a.start_date <= now())
      AND (a.end_date IS NULL OR a.end_date >= now())
    UNION
    SELECT r.code AS code
    FROM assignment a
    JOIN laboratory l ON l.code = a.scope_id
    JOIN room r ON r.laboratory_id = l.id
    WHERE a.user_id = ${userId}
      AND a.active
      AND a.scope_type = 'LABORATORY'
      AND a.assignment_type IN ('PLP', 'PIC')
      AND (a.start_date IS NULL OR a.start_date <= now())
      AND (a.end_date IS NULL OR a.end_date >= now())
  `);
  const scope: RoomScope = {
    all: false,
    roomCodes: result.rows.map((row) => row.code).sort(),
  };
  cache.set(userId, { scope, expiresAt: Date.now() + CACHE_TTL_MS });
  return scope;
}

// Services accept `null` to mean "no room filter" so an admin scope stays one
// code path. An empty array means no lab is allowed.
export function scopeRoomCodes(scope: RoomScope): string[] | null {
  return scope.all ? null : scope.roomCodes;
}

// Convenience for API route handlers that already hold the verified session.
export async function scopeForSession(session: {
  user: { id: string; role?: string | null };
}) {
  const scope = await getRoomScope(session.user.id, session.user.role);
  return { scope, roomCodes: scopeRoomCodes(scope) };
}

export function assertRoomInScope(scope: RoomScope, roomCode: string) {
  if (scope.all) return;
  if (!scope.roomCodes.includes(roomCode))
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Lab ini di luar penugasan Anda.",
    );
}

export async function assertRequestInScope(scope: RoomScope, requestId: string) {
  if (scope.all) return;
  const [row] = await db
    .select({ roomCode: room.code })
    .from(resourceRequest)
    .innerJoin(room, eq(room.id, resourceRequest.roomId))
    .where(eq(resourceRequest.id, requestId))
    .limit(1);
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Request tidak ditemukan.");
  assertRoomInScope(scope, row.roomCode);
}

export async function assertSessionInScope(scope: RoomScope, roomId: string) {
  if (scope.all) return;
  const [row] = await db
    .select({ code: room.code })
    .from(room)
    .where(eq(room.id, roomId))
    .limit(1);
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Room tidak ditemukan.");
  assertRoomInScope(scope, row.code);
}

export async function assertOpnameInScope(
  scope: RoomScope,
  sessionId: string,
) {
  if (scope.all) return;
  const [row] = await db
    .select({ roomCode: room.code })
    .from(stockOpnameSession)
    .innerJoin(room, eq(room.id, stockOpnameSession.roomId))
    .where(eq(stockOpnameSession.id, sessionId))
    .limit(1);
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
  assertRoomInScope(scope, row.roomCode);
}

export async function assertIncidentInScope(scope: RoomScope, code: string) {
  if (scope.all) return;
  const [row] = await db
    .select({ roomCode: room.code })
    .from(incident)
    .leftJoin(room, eq(room.id, incident.roomId))
    .where(eq(incident.code, code))
    .limit(1);
  if (!row || !row.roomCode || !scope.roomCodes.includes(row.roomCode))
    throw new ApiError(404, "NOT_FOUND", "Incident tidak ditemukan.");
}

// Audit rows carry an entity id, not a room. This keeps only entries whose
// record belongs to one of the given labs; entries without a room (role
// changes, settings) are excluded for scoped readers.
export function auditRoomScopeSql(codes: string[]): SQL {
  const codeList = sql`(${sql.join(
    codes.map((code) => sql`${code}`),
    sql`, `,
  )})`;
  return sql`(
    (${auditLog.entityType} = 'resource_request' AND ${auditLog.entityId} IN (
      SELECT rr.id::text FROM resource_request rr
      JOIN room r ON r.id = rr.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'incident' AND ${auditLog.entityId} IN (
      SELECT i.id::text FROM incident i
      JOIN room r ON r.id = i.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'material' AND ${auditLog.entityId} IN (
      SELECT m.id::text FROM material m
      JOIN material_batch b ON b.material_id = m.id
      JOIN room r ON r.id = b.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'material_batch' AND ${auditLog.entityId} IN (
      SELECT b.id::text FROM material_batch b
      JOIN room r ON r.id = b.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'equipment_asset' AND ${auditLog.entityId} IN (
      SELECT a.id::text FROM equipment_asset a
      JOIN room r ON r.id = a.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'equipment_unit' AND ${auditLog.entityId} IN (
      SELECT u.id::text FROM equipment_unit u
      JOIN equipment_asset a ON a.id = u.equipment_asset_id
      JOIN room r ON r.id = a.room_id WHERE r.code IN ${codeList}
    ))
    OR (${auditLog.entityType} = 'stock_opname_session' AND ${auditLog.entityId} IN (
      SELECT s.id::text FROM stock_opname_session s
      JOIN room r ON r.id = s.room_id WHERE r.code IN ${codeList}
    ))
  )`;
}
