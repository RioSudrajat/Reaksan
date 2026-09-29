import "server-only";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  equipmentAsset,
  equipmentConditionHistory,
  equipmentType,
  equipmentUnit,
  incident,
  incidentAssessment,
  incidentResolution,
  reservation,
  resourceRequest,
  room,
  sharedUsage,
  user,
} from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { writeAudit } from "@/services/audit.service";
import {
  createNotification,
  createNotifications,
  listStaffRecipients,
} from "@/services/notifications.service";
import type {
  AssessIncidentInput,
  CreateIncidentInput,
  ResolveIncidentInput,
} from "@/validators/incidents";

export type IncidentDto = {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: (typeof incident.$inferSelect)["severity"];
  status: (typeof incident.$inferSelect)["status"];
  occurredAt: string | null;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  equipmentCode: string | null;
  equipmentName: string | null;
  roomCode: string | null;
  roomName: string | null;
  requestId: string | null;
  requestCode: string | null;
  reservationId: string | null;
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

async function incidentCode(exec: DbExecutor) {
  const year = new Date().getFullYear();
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(incident)
    .where(sql`${incident.code} LIKE ${`INC-${year}-%`}`);
  return `INC-${year}-${String((row?.count ?? 0) + 1).padStart(3, "0")}`;
}

export type IncidentLoadFilters = {
  incidentId?: string;
  code?: string;
  reporterId?: string;
  statuses?: (typeof incident.$inferSelect)["status"][];
  severities?: (typeof incident.$inferSelect)["severity"][];
  roomCode?: string;
  // null = no scope filter; an empty array means no lab is allowed.
  roomCodes?: string[] | null;
  search?: string;
  limit?: number;
  offset?: number;
};

function incidentConditions(options: IncidentLoadFilters) {
  const conditions = [];
  if (options.incidentId) conditions.push(eq(incident.id, options.incidentId));
  if (options.code) conditions.push(eq(incident.code, options.code));
  if (options.reporterId)
    conditions.push(eq(incident.reporterId, options.reporterId));
  if (options.statuses?.length)
    conditions.push(inArray(incident.status, options.statuses));
  if (options.severities?.length)
    conditions.push(inArray(incident.severity, options.severities));
  if (options.roomCode) conditions.push(eq(room.code, options.roomCode));
  if (options.roomCodes !== undefined)
    conditions.push(
      options.roomCodes === null
        ? sql`true`
        : options.roomCodes.length === 0
          ? sql`false`
          : inArray(room.code, options.roomCodes),
    );
  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        ilike(incident.code, pattern),
        ilike(incident.title, pattern),
        ilike(incident.description, pattern),
        ilike(user.name, pattern),
        ilike(equipmentAsset.assetCode, pattern),
      ),
    );
  }
  return conditions;
}

export async function loadIncidentDtos(
  exec: DbExecutor,
  options: IncidentLoadFilters,
): Promise<IncidentDto[]> {
  const conditions = incidentConditions(options);
  const rows = await exec
    .select({
      id: incident.id,
      code: incident.code,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      occurredAt: incident.occurredAt,
      createdAt: incident.createdAt,
      reporterId: incident.reporterId,
      reporterName: user.name,
      equipmentCode: equipmentAsset.assetCode,
      equipmentName: equipmentType.name,
      roomCode: room.code,
      roomName: room.name,
      requestId: incident.requestId,
      requestCode: resourceRequest.code,
      reservationId: incident.reservationId,
    })
    .from(incident)
    .innerJoin(user, eq(user.id, incident.reporterId))
    .leftJoin(equipmentAsset, eq(equipmentAsset.id, incident.equipmentAssetId))
    .leftJoin(
      equipmentType,
      eq(equipmentType.id, equipmentAsset.equipmentTypeId),
    )
    .leftJoin(room, eq(room.id, incident.roomId))
    .leftJoin(resourceRequest, eq(resourceRequest.id, incident.requestId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(incident.createdAt))
    .limit(options.limit ?? 200)
    .offset(options.offset ?? 0);
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const assessmentRows = await exec
    .select({
      incidentId: incidentAssessment.incidentId,
      finding: incidentAssessment.finding,
      assessment: incidentAssessment.assessment,
      recommendedAction: incidentAssessment.recommendedAction,
      createdAt: incidentAssessment.createdAt,
      assessedByName: user.name,
    })
    .from(incidentAssessment)
    .innerJoin(user, eq(user.id, incidentAssessment.assessedById))
    .where(inArray(incidentAssessment.incidentId, ids));
  const resolutionRows = await exec
    .select({
      incidentId: incidentResolution.incidentId,
      action: incidentResolution.action,
      notes: incidentResolution.resolutionNotes,
      resolvedAt: incidentResolution.resolvedAt,
      resolvedByName: user.name,
    })
    .from(incidentResolution)
    .innerJoin(user, eq(user.id, incidentResolution.resolvedById))
    .where(inArray(incidentResolution.incidentId, ids));

  return rows.map<IncidentDto>((row) => {
    const assessment = assessmentRows.find((item) => item.incidentId === row.id);
    const resolution = resolutionRows.find((item) => item.incidentId === row.id);
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      occurredAt: row.occurredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      reporterId: row.reporterId,
      reporterName: row.reporterName,
      equipmentCode: row.equipmentCode ?? null,
      equipmentName: row.equipmentName ?? null,
      roomCode: row.roomCode ?? null,
      roomName: row.roomName ?? null,
      requestId: row.requestId ?? null,
      requestCode: row.requestCode ?? null,
      reservationId: row.reservationId ?? null,
      assessment: assessment
        ? {
            finding: assessment.finding,
            assessment: assessment.assessment,
            recommendedAction: assessment.recommendedAction,
            createdAt: assessment.createdAt.toISOString(),
            assessedByName: assessment.assessedByName,
          }
        : null,
      resolution: resolution
        ? {
            action: resolution.action,
            notes: resolution.notes,
            resolvedAt: resolution.resolvedAt.toISOString(),
            resolvedByName: resolution.resolvedByName,
          }
        : null,
    };
  });
}

export async function createIncident(
  userId: string,
  input: CreateIncidentInput,
  options?: {
    allowStaffScope?: boolean;
    roomCodes?: string[] | null;
  },
) {
  return db.transaction(async (tx) => {
    let assetRow:
      | {
          id: string;
          assetCode: string;
          name: string;
          roomId: string;
          roomName: string;
        }
      | undefined;
    if (input.equipmentCode) {
      const [row] = await tx
        .select({
          id: equipmentAsset.id,
          assetCode: equipmentAsset.assetCode,
          name: equipmentType.name,
          roomId: equipmentAsset.roomId,
          roomName: room.name,
        })
        .from(equipmentAsset)
        .innerJoin(
          equipmentType,
          eq(equipmentType.id, equipmentAsset.equipmentTypeId),
        )
        .innerJoin(room, eq(room.id, equipmentAsset.roomId))
        .where(
          and(
            eq(equipmentAsset.assetCode, input.equipmentCode),
            eq(equipmentAsset.active, true),
          ),
        )
        .limit(1);
      if (!row)
        throw new ApiError(
          422,
          "UNKNOWN_EQUIPMENT",
          "Equipment is not tracked in the catalog.",
        );
      assetRow = row;
    }

    let roomRow: { id: string; name: string } | undefined;
    if (input.roomCode) {
      const [row] = await tx
        .select({ id: room.id, name: room.name })
        .from(room)
        .where(and(eq(room.code, input.roomCode), eq(room.active, true)))
        .limit(1);
      if (!row)
        throw new ApiError(422, "ROOM_NOT_FOUND", "Room is not available.");
      roomRow = row;
    }

    if (
      options?.allowStaffScope &&
      options.roomCodes !== undefined &&
      options.roomCodes !== null
    ) {
      if (input.roomCode && !options.roomCodes.includes(input.roomCode)) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Ruangan berada di luar lab penugasan Anda.",
        );
      }
      if (assetRow) {
        const [assetRoom] = await tx
          .select({ code: room.code })
          .from(room)
          .where(eq(room.id, assetRow.roomId))
          .limit(1);
        if (assetRoom && !options.roomCodes.includes(assetRoom.code)) {
          throw new ApiError(
            403,
            "FORBIDDEN",
            "Alat berada di lab di luar penugasan Anda.",
          );
        }
      }
    }

    if (input.requestId) {
      const [reqRow] = await tx
        .select({
          id: resourceRequest.id,
          studentId: resourceRequest.studentId,
          roomId: resourceRequest.roomId,
          roomCode: room.code,
        })
        .from(resourceRequest)
        .innerJoin(room, eq(room.id, resourceRequest.roomId))
        .where(eq(resourceRequest.id, input.requestId))
        .limit(1);
      if (!reqRow) {
        throw new ApiError(404, "NOT_FOUND", "Request tidak ditemukan.");
      }
      if (!options?.allowStaffScope && reqRow.studentId !== userId) {
        throw new ApiError(
          422,
          "UNKNOWN_REQUEST",
          "Request ini bukan milikmu.",
        );
      }
      if (
        options?.allowStaffScope &&
        options.roomCodes !== undefined &&
        options.roomCodes !== null &&
        !options.roomCodes.includes(reqRow.roomCode)
      ) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Request berada di luar lab penugasan Anda.",
        );
      }
    }
    if (input.reservationId) {
      const [resRow] = await tx
        .select({
          id: reservation.id,
          primaryUserId: reservation.primaryUserId,
          roomId: equipmentAsset.roomId,
          roomCode: room.code,
        })
        .from(reservation)
        .innerJoin(
          equipmentAsset,
          eq(equipmentAsset.id, reservation.equipmentAssetId),
        )
        .innerJoin(room, eq(room.id, equipmentAsset.roomId))
        .where(eq(reservation.id, input.reservationId))
        .limit(1);
      if (!resRow) {
        throw new ApiError(404, "NOT_FOUND", "Reservation tidak ditemukan.");
      }
      if (!options?.allowStaffScope) {
        const isPrimary = resRow.primaryUserId === userId;
        const [shared] = isPrimary
          ? [undefined]
          : await tx
              .select({ id: sharedUsage.id })
              .from(sharedUsage)
              .where(
                and(
                  eq(sharedUsage.reservationId, input.reservationId),
                  eq(sharedUsage.userId, userId),
                ),
              )
              .limit(1);
        if (!isPrimary && !shared) {
          throw new ApiError(
            422,
            "UNKNOWN_RESERVATION",
            "Reservation ini tidak terhubung ke akunmu.",
          );
        }
      }
      if (
        options?.allowStaffScope &&
        options.roomCodes !== undefined &&
        options.roomCodes !== null &&
        !options.roomCodes.includes(resRow.roomCode)
      ) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Reservation berada di luar lab penugasan Anda.",
        );
      }
    }

    const [actor] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const code = await incidentCode(tx);
    const roomId = roomRow?.id ?? assetRow?.roomId ?? null;
    const [created] = await tx
      .insert(incident)
      .values({
        code,
        equipmentAssetId: assetRow?.id ?? null,
        roomId,
        requestId: input.requestId ?? null,
        reservationId: input.reservationId ?? null,
        reporterId: userId,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: "REPORTED",
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : null,
      })
      .returning({ id: incident.id });

    const resourceLabel =
      assetRow?.name ?? roomRow?.name ?? "laboratorium";
    const staff = await listStaffRecipients(tx);
    const actorRoleLabel = options?.allowStaffScope ? "Petugas lab" : "Mahasiswa";
    await createNotifications(
      tx,
      staff
        .filter((recipientId) => recipientId !== userId)
        .map((recipientId) => ({
          recipientId,
          type: "INCIDENT_REPORTED" as const,
          title: "Incident baru dilaporkan",
          message: `${actor?.name ?? actorRoleLabel} melaporkan insiden di ${resourceLabel}.`,
          referenceType: "incident",
          referenceId: created.id,
        })),
    );
    await writeAudit(tx, {
      actorId: userId,
      action: "REPORT_INCIDENT",
      entityType: "incident",
      entityId: created.id,
      after: { code, severity: input.severity },
    });
    const [dto] = await loadIncidentDtos(tx, { incidentId: created.id });
    return dto;
  });
}

export async function listMyIncidents(userId: string) {
  return loadIncidentDtos(db, { reporterId: userId });
}

export async function getMyIncident(userId: string, code: string) {
  const rows = await loadIncidentDtos(db, { code, reporterId: userId });
  return rows[0] ?? null;
}

export async function countIncidentRows(
  exec: DbExecutor,
  filters: IncidentLoadFilters,
) {
  const conditions = incidentConditions(filters);
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(incident)
    .innerJoin(user, eq(user.id, incident.reporterId))
    .leftJoin(equipmentAsset, eq(equipmentAsset.id, incident.equipmentAssetId))
    .leftJoin(room, eq(room.id, incident.roomId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row?.count ?? 0;
}

export async function listIncidentPage(filters: IncidentLoadFilters) {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const [data, total] = await Promise.all([
    loadIncidentDtos(db, { ...filters, limit, offset }),
    countIncidentRows(db, filters),
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

export async function getAnyIncident(code: string) {
  const rows = await loadIncidentDtos(db, { code });
  return rows[0] ?? null;
}

export async function assessIncident(
  actorId: string,
  code: string,
  input: AssessIncidentInput,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: incident.id,
        code: incident.code,
        reporterId: incident.reporterId,
        assetId: incident.equipmentAssetId,
      })
      .from(incident)
      .where(eq(incident.code, code))
      .limit(1)
      .for("update");
    if (!row)
      throw new ApiError(404, "NOT_FOUND", "Incident not found.");
    await tx
      .insert(incidentAssessment)
      .values({
        incidentId: row.id,
        assessedById: actorId,
        finding: input.finding,
        assessment: input.assessment,
        recommendedAction: input.recommendedAction ?? null,
      })
      .onConflictDoUpdate({
        target: incidentAssessment.incidentId,
        set: {
          assessedById: actorId,
          finding: input.finding,
          assessment: input.assessment,
          recommendedAction: input.recommendedAction ?? null,
        },
      });
    const nextStatus = input.status ?? "UNDER_ASSESSMENT";
    await tx
      .update(incident)
      .set({ status: nextStatus })
      .where(eq(incident.id, row.id));
    if (row.assetId && input.equipmentCondition) {
      await tx
        .update(equipmentAsset)
        .set({
          condition: input.equipmentCondition,
          ...(input.equipmentCondition === "DAMAGED"
            ? { status: "DAMAGED" as const }
            : {}),
        })
        .where(eq(equipmentAsset.id, row.assetId));
      await tx.insert(equipmentConditionHistory).values({
        equipmentAssetId: row.assetId,
        condition: input.equipmentCondition,
        source: "INCIDENT_ASSESSMENT",
        recordedById: actorId,
        notes: input.assessment,
      });
    }
    await createNotification(tx, {
      recipientId: row.reporterId,
      type: "INCIDENT_UPDATED",
      title: "Incident diperbarui",
      message: `${row.code}: ${input.assessment}`,
      referenceType: "incident",
      referenceId: row.id,
    });
    await writeAudit(tx, {
      actorId,
      action: "ASSESS_INCIDENT",
      entityType: "incident",
      entityId: row.id,
      after: { status: nextStatus, condition: input.equipmentCondition },
    });
    const [dto] = await loadIncidentDtos(tx, { incidentId: row.id });
    return dto;
  });
}

export async function resolveIncident(
  actorId: string,
  code: string,
  input: ResolveIncidentInput,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: incident.id,
        code: incident.code,
        reporterId: incident.reporterId,
        assetId: incident.equipmentAssetId,
      })
      .from(incident)
      .where(eq(incident.code, code))
      .limit(1)
      .for("update");
    if (!row)
      throw new ApiError(404, "NOT_FOUND", "Incident not found.");
    await tx
      .insert(incidentResolution)
      .values({
        incidentId: row.id,
        resolvedById: actorId,
        action: input.action,
        resolutionNotes: input.notes ?? null,
      })
      .onConflictDoUpdate({
        target: incidentResolution.incidentId,
        set: {
          resolvedById: actorId,
          action: input.action,
          resolutionNotes: input.notes ?? null,
          resolvedAt: new Date(),
        },
      });
    await tx
      .update(incident)
      .set({ status: "RESOLVED" })
      .where(eq(incident.id, row.id));
    if (row.assetId && input.equipmentStatus) {
      await tx
        .update(equipmentAsset)
        .set({ status: input.equipmentStatus })
        .where(eq(equipmentAsset.id, row.assetId));
      await tx
        .update(equipmentUnit)
        .set({ status: input.equipmentStatus })
        .where(
          and(
            eq(equipmentUnit.equipmentAssetId, row.assetId),
            eq(equipmentUnit.status, "UNDER_INSPECTION"),
          ),
        );
    }
    await createNotification(tx, {
      recipientId: row.reporterId,
      type: "INCIDENT_UPDATED",
      title: "Incident selesai",
      message: `${row.code}: ${input.action}`,
      referenceType: "incident",
      referenceId: row.id,
    });
    await writeAudit(tx, {
      actorId,
      action: "RESOLVE_INCIDENT",
      entityType: "incident",
      entityId: row.id,
      after: { status: "RESOLVED" },
    });
    const [dto] = await loadIncidentDtos(tx, { incidentId: row.id });
    return dto;
  });
}
