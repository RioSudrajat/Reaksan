import "server-only";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  instrumentAsset,
  instrumentConditionHistory,
  instrumentType,
  instrumentUnit,
  toolAsset,
  toolConditionHistory,
  toolType,
  toolUnit,
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
import { nextYearlyCode } from "@/services/code-sequence";
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

function incidentCode(exec: DbExecutor) {
  return nextYearlyCode(exec, "incident", "INC");
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
        ilike(instrumentAsset.assetCode, pattern),
        ilike(toolAsset.assetCode, pattern),
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
      instrumentCode: instrumentAsset.assetCode,
      instrumentName: instrumentType.name,
      toolCode: toolAsset.assetCode,
      toolName: toolType.name,
      roomCode: room.code,
      roomName: room.name,
      requestId: incident.requestId,
      requestCode: resourceRequest.code,
      reservationId: incident.reservationId,
    })
    .from(incident)
    .innerJoin(user, eq(user.id, incident.reporterId))
    .leftJoin(
      instrumentAsset,
      eq(instrumentAsset.id, incident.instrumentAssetId),
    )
    .leftJoin(
      instrumentType,
      eq(instrumentType.id, instrumentAsset.instrumentTypeId),
    )
    .leftJoin(toolAsset, eq(toolAsset.id, incident.toolAssetId))
    .leftJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
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
    const assessment = assessmentRows.find(
      (item) => item.incidentId === row.id,
    );
    const resolution = resolutionRows.find(
      (item) => item.incidentId === row.id,
    );
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
      equipmentCode: row.instrumentCode ?? row.toolCode ?? null,
      equipmentName: row.instrumentName ?? row.toolName ?? null,
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
          type: "INSTRUMENT" | "TOOL";
          assetCode: string;
          name: string;
          roomId: string;
          roomName: string;
        }
      | undefined;
    if (input.equipmentCode) {
      const [insRow] = await tx
        .select({
          id: instrumentAsset.id,
          assetCode: instrumentAsset.assetCode,
          name: instrumentType.name,
          roomId: instrumentAsset.roomId,
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
            eq(instrumentAsset.assetCode, input.equipmentCode),
            eq(instrumentAsset.active, true),
          ),
        )
        .limit(1);

      if (insRow) {
        assetRow = { ...insRow, type: "INSTRUMENT" };
      } else {
        const [insUnitRow] = await tx
          .select({
            id: instrumentAsset.id,
            assetCode: instrumentAsset.assetCode,
            name: instrumentType.name,
            roomId: instrumentAsset.roomId,
            roomName: room.name,
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
              eq(instrumentUnit.code, input.equipmentCode),
              eq(instrumentUnit.active, true),
            ),
          )
          .limit(1);

        if (insUnitRow) {
          assetRow = { ...insUnitRow, type: "INSTRUMENT" };
        } else {
          const [tolRow] = await tx
            .select({
              id: toolAsset.id,
              assetCode: toolAsset.assetCode,
              name: toolType.name,
              roomId: toolAsset.roomId,
              roomName: room.name,
            })
            .from(toolAsset)
            .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
            .innerJoin(room, eq(room.id, toolAsset.roomId))
            .where(
              and(
                eq(toolAsset.assetCode, input.equipmentCode),
                eq(toolAsset.active, true),
              ),
            )
            .limit(1);

          if (tolRow) {
            assetRow = { ...tolRow, type: "TOOL" };
          } else {
            const [tolUnitRow] = await tx
              .select({
                id: toolAsset.id,
                assetCode: toolAsset.assetCode,
                name: toolType.name,
                roomId: toolAsset.roomId,
                roomName: room.name,
              })
              .from(toolUnit)
              .innerJoin(toolAsset, eq(toolAsset.id, toolUnit.toolAssetId))
              .innerJoin(toolType, eq(toolType.id, toolAsset.toolTypeId))
              .innerJoin(room, eq(room.id, toolAsset.roomId))
              .where(
                and(
                  eq(toolUnit.code, input.equipmentCode),
                  eq(toolUnit.active, true),
                ),
              )
              .limit(1);

            if (tolUnitRow) {
              assetRow = { ...tolUnitRow, type: "TOOL" };
            }
          }
        }
      }

      if (!assetRow)
        throw new ApiError(
          422,
          "UNKNOWN_EQUIPMENT",
          "Equipment is not tracked in the catalog.",
        );
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
          roomId: instrumentAsset.roomId,
          roomCode: room.code,
        })
        .from(reservation)
        .innerJoin(
          instrumentAsset,
          eq(instrumentAsset.id, reservation.instrumentAssetId),
        )
        .innerJoin(room, eq(room.id, instrumentAsset.roomId))
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
        instrumentAssetId: assetRow?.type === "INSTRUMENT" ? assetRow.id : null,
        toolAssetId: assetRow?.type === "TOOL" ? assetRow.id : null,
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

    const resourceLabel = assetRow?.name ?? roomRow?.name ?? "laboratorium";
    const staff = await listStaffRecipients(tx, roomId);
    const actorRoleLabel = options?.allowStaffScope
      ? "Petugas lab"
      : "Mahasiswa";
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
    .leftJoin(
      instrumentAsset,
      eq(instrumentAsset.id, incident.instrumentAssetId),
    )
    .leftJoin(toolAsset, eq(toolAsset.id, incident.toolAssetId))
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
        instrumentAssetId: incident.instrumentAssetId,
        toolAssetId: incident.toolAssetId,
      })
      .from(incident)
      .where(eq(incident.code, code))
      .limit(1)
      .for("update");
    if (!row) throw new ApiError(404, "NOT_FOUND", "Incident not found.");
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

    if (row.instrumentAssetId && input.equipmentCondition) {
      await tx
        .update(instrumentAsset)
        .set({
          condition: input.equipmentCondition,
          ...(input.equipmentCondition === "DAMAGED"
            ? { status: "DAMAGED" as const }
            : {}),
        })
        .where(eq(instrumentAsset.id, row.instrumentAssetId));
      await tx.insert(instrumentConditionHistory).values({
        instrumentAssetId: row.instrumentAssetId,
        condition: input.equipmentCondition,
        source: "INCIDENT_ASSESSMENT",
        recordedById: actorId,
        notes: input.assessment,
      });
    }

    if (row.toolAssetId && input.equipmentCondition) {
      await tx
        .update(toolAsset)
        .set({
          condition: input.equipmentCondition,
          ...(input.equipmentCondition === "DAMAGED"
            ? { status: "DAMAGED" as const }
            : {}),
        })
        .where(eq(toolAsset.id, row.toolAssetId));
      await tx.insert(toolConditionHistory).values({
        toolAssetId: row.toolAssetId,
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
        instrumentAssetId: incident.instrumentAssetId,
        toolAssetId: incident.toolAssetId,
      })
      .from(incident)
      .where(eq(incident.code, code))
      .limit(1)
      .for("update");
    if (!row) throw new ApiError(404, "NOT_FOUND", "Incident not found.");
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

    if (row.instrumentAssetId && input.equipmentStatus) {
      await tx
        .update(instrumentAsset)
        .set({ status: input.equipmentStatus })
        .where(eq(instrumentAsset.id, row.instrumentAssetId));
      await tx
        .update(instrumentUnit)
        .set({ status: input.equipmentStatus })
        .where(
          and(
            eq(instrumentUnit.instrumentAssetId, row.instrumentAssetId),
            eq(instrumentUnit.status, "UNDER_INSPECTION"),
          ),
        );
    }

    if (row.toolAssetId && input.equipmentStatus) {
      await tx
        .update(toolAsset)
        .set({ status: input.equipmentStatus })
        .where(eq(toolAsset.id, row.toolAssetId));
      await tx
        .update(toolUnit)
        .set({ status: input.equipmentStatus })
        .where(
          and(
            eq(toolUnit.toolAssetId, row.toolAssetId),
            eq(toolUnit.status, "UNDER_INSPECTION"),
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
