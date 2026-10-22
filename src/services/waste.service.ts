import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  room,
  user,
  resourceRequest,
  wasteCategory,
  wasteContainer,
  wasteDisposalLog,
  wasteManifest,
  wasteContainerStatusEnum,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { writeAudit } from "@/services/audit.service";
import type {
  BatchVerifyWasteLogInput,
  CreateWasteContainerInput,
  CreateWasteManifestInput,
  LogWasteDisposalInput,
  MoveToTpsInput,
  SealAndRolloverInput,
  UpdateWasteContainerInput,
  VerifyWasteLogInput,
  WasteExportQuery,
} from "@/validators/waste";

export function resolveDateRange(query: WasteExportQuery): {
  from: Date;
  to: Date;
  label: string;
} {
  const now = new Date();
  const currentYear = query.year ?? now.getFullYear();

  if (query.period === "monthly") {
    let year = currentYear;
    let month = now.getMonth(); // 0-based
    if (query.month) {
      const [y, m] = query.month.split("-").map(Number);
      if (y && m) {
        year = y;
        month = m - 1;
      }
    }
    const from = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return { from, to, label: `Bulan ${monthNames[month]} ${year}` };
  }

  if (query.period === "semester") {
    const sem = query.semester ?? (now.getMonth() >= 8 || now.getMonth() <= 0 ? "ganjil" : "genap");
    if (sem === "ganjil") {
      const from = new Date(Date.UTC(currentYear, 8, 1, 0, 0, 0)); // 1 Sept
      const to = new Date(Date.UTC(currentYear + 1, 1, 0, 23, 59, 59, 999)); // Akhir Jan
      return { from, to, label: `Semester Ganjil ${currentYear}/${currentYear + 1}` };
    } else {
      const from = new Date(Date.UTC(currentYear, 1, 1, 0, 0, 0)); // 1 Feb
      const to = new Date(Date.UTC(currentYear, 6, 0, 23, 59, 59, 999)); // Akhir Jun
      return { from, to, label: `Semester Genap ${currentYear}` };
    }
  }

  if (query.period === "quarterly") {
    const q = query.quarter ?? `Q${Math.floor(now.getMonth() / 3) + 1}`;
    let startMonth = 0;
    if (q === "Q2") startMonth = 3;
    if (q === "Q3") startMonth = 6;
    if (q === "Q4") startMonth = 9;
    const from = new Date(Date.UTC(currentYear, startMonth, 1, 0, 0, 0));
    const to = new Date(Date.UTC(currentYear, startMonth + 3, 0, 23, 59, 59, 999));
    return { from, to, label: `Triwulan ${q} ${currentYear}` };
  }

  // Custom
  const from = query.from ? new Date(query.from) : new Date(Date.UTC(currentYear, 0, 1));
  const to = query.to ? new Date(query.to) : new Date();
  return {
    from,
    to,
    label: `Periode ${from.toISOString().split("T")[0]} s.d. ${to.toISOString().split("T")[0]}`,
  };
}

export async function listWasteCategories() {
  return db
    .select()
    .from(wasteCategory)
    .where(eq(wasteCategory.active, true))
    .orderBy(wasteCategory.name);
}

export async function listWasteContainers(
  roomCodes: string[] | null,
  options?: { roomId?: string; roomCode?: string; status?: string; activeOnly?: boolean },
) {
  const conditions = [];

  if (roomCodes !== null) {
    if (roomCodes.length === 0) return [];
    conditions.push(inArray(room.code, roomCodes));
  }

  if (options?.roomId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.roomId);
    if (isUuid) {
      conditions.push(eq(wasteContainer.roomId, options.roomId));
    } else {
      conditions.push(eq(room.code, options.roomId));
    }
  } else if (options?.roomCode) {
    conditions.push(eq(room.code, options.roomCode));
  }

  if (options?.status) {
    conditions.push(
      eq(
        wasteContainer.status,
        options.status as (typeof wasteContainerStatusEnum.enumValues)[number],
      ),
    );
  }

  if (options?.activeOnly ?? true) {
    conditions.push(eq(wasteContainer.active, true));
  }

  const rows = await db
    .select({
      id: wasteContainer.id,
      code: wasteContainer.code,
      name: wasteContainer.name,
      roomId: wasteContainer.roomId,
      roomCode: room.code,
      roomName: room.name,
      categoryId: wasteContainer.categoryId,
      categoryCode: wasteCategory.code,
      categoryName: wasteCategory.name,
      categoryPhysicalState: wasteCategory.physicalState,
      categoryHazardBadge: wasteCategory.hazardBadge,
      categoryColorHex: wasteCategory.colorHex,
      maxCapacity: wasteContainer.maxCapacity,
      currentVolume: wasteContainer.currentVolume,
      unit: wasteContainer.unit,
      status: wasteContainer.status,
      active: wasteContainer.active,
      qrCode: wasteContainer.qrCode,
      locationNotes: wasteContainer.locationNotes,
      openedAt: wasteContainer.openedAt,
      closedAt: wasteContainer.closedAt,
      tpsMovedAt: wasteContainer.tpsMovedAt,
      disposedAt: wasteContainer.disposedAt,
      manifestId: wasteContainer.manifestId,
      manifestCode: wasteManifest.code,
      manifestNumber: wasteManifest.manifestNumber,
      transporterName: wasteManifest.transporterName,
      createdAt: wasteContainer.createdAt,
    })
    .from(wasteContainer)
    .innerJoin(room, eq(room.id, wasteContainer.roomId))
    .innerJoin(wasteCategory, eq(wasteCategory.id, wasteContainer.categoryId))
    .leftJoin(wasteManifest, eq(wasteManifest.id, wasteContainer.manifestId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(wasteContainer.createdAt));

  const now = Date.now();
  return rows.map((c) => {
    const max = Number(c.maxCapacity) || 1;
    const cur = Number(c.currentVolume) || 0;
    const percentage = Math.min(100, Math.round((cur / max) * 100));
    const openedTime = new Date(c.openedAt).getTime();
    const ageDays = Math.max(0, Math.floor((now - openedTime) / (1000 * 60 * 60 * 24)));
    const isRetentionWarning = ageDays >= 75 && c.status === "ACTIVE";
    const isCapacityWarning = percentage >= 80 && c.status === "ACTIVE";

    return {
      ...c,
      percentage,
      ageDays,
      isRetentionWarning,
      isCapacityWarning,
    };
  });
}

export async function getWasteContainerById(id: string) {
  const [row] = await db
    .select({
      id: wasteContainer.id,
      code: wasteContainer.code,
      name: wasteContainer.name,
      roomId: wasteContainer.roomId,
      roomCode: room.code,
      roomName: room.name,
      categoryId: wasteContainer.categoryId,
      categoryCode: wasteCategory.code,
      categoryName: wasteCategory.name,
      categoryHazardBadge: wasteCategory.hazardBadge,
      categoryColorHex: wasteCategory.colorHex,
      maxCapacity: wasteContainer.maxCapacity,
      currentVolume: wasteContainer.currentVolume,
      unit: wasteContainer.unit,
      status: wasteContainer.status,
      active: wasteContainer.active,
      qrCode: wasteContainer.qrCode,
      locationNotes: wasteContainer.locationNotes,
      openedAt: wasteContainer.openedAt,
      closedAt: wasteContainer.closedAt,
      tpsMovedAt: wasteContainer.tpsMovedAt,
      disposedAt: wasteContainer.disposedAt,
      manifestId: wasteContainer.manifestId,
      manifestCode: wasteManifest.code,
      manifestNumber: wasteManifest.manifestNumber,
      transporterName: wasteManifest.transporterName,
      createdAt: wasteContainer.createdAt,
    })
    .from(wasteContainer)
    .innerJoin(room, eq(room.id, wasteContainer.roomId))
    .innerJoin(wasteCategory, eq(wasteCategory.id, wasteContainer.categoryId))
    .leftJoin(wasteManifest, eq(wasteManifest.id, wasteContainer.manifestId))
    .where(eq(wasteContainer.id, id))
    .limit(1);

  if (!row) throw new ApiError(404, "NOT_FOUND", "Wadah limbah tidak ditemukan.");
  return row;
}

export async function createWasteContainer(
  input: CreateWasteContainerInput,
  actorId: string,
) {
  const [targetRoom] = await db
    .select({ id: room.id, code: room.code })
    .from(room)
    .where(eq(room.id, input.roomId))
    .limit(1);
  if (!targetRoom) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");

  const [category] = await db
    .select({ id: wasteCategory.id, code: wasteCategory.code })
    .from(wasteCategory)
    .where(eq(wasteCategory.id, input.categoryId))
    .limit(1);
  if (!category) throw new ApiError(404, "NOT_FOUND", "Kategori limbah tidak ditemukan.");

  const code =
    input.code ||
    `JRG-${targetRoom.code.toUpperCase()}-${category.code.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const qrCode = `reaksan://waste-container/${code}`;

  return db.transaction(async (tx) => {
    const [container] = await tx
      .insert(wasteContainer)
      .values({
        code,
        roomId: input.roomId,
        categoryId: input.categoryId,
        name: input.name,
        maxCapacity: input.maxCapacity.toFixed(2),
        currentVolume: "0.00",
        unit: input.unit || "L",
        status: "ACTIVE",
        active: true,
        qrCode,
        locationNotes: input.locationNotes,
      })
      .returning();

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "waste_container",
      entityId: container.id,
      after: container,
      reason: `Mendaftarkan jerigen limbah baru ${container.code} (${container.name})`,
    });

    return container;
  });
}

export async function updateWasteContainer(
  id: string,
  input: UpdateWasteContainerInput,
  actorId: string,
) {
  const existing = await getWasteContainerById(id);

  const updateValues: Record<string, unknown> = {};
  if (input.name !== undefined) updateValues.name = input.name;
  if (input.categoryId !== undefined) updateValues.categoryId = input.categoryId;
  if (input.maxCapacity !== undefined)
    updateValues.maxCapacity = input.maxCapacity.toFixed(2);
  if (input.unit !== undefined) updateValues.unit = input.unit;
  if (input.locationNotes !== undefined)
    updateValues.locationNotes = input.locationNotes;
  if (input.status !== undefined) updateValues.status = input.status;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(wasteContainer)
      .set(updateValues)
      .where(eq(wasteContainer.id, id))
      .returning();

    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "waste_container",
      entityId: id,
      before: existing,
      after: updated,
      reason: `Memperbarui data jerigen limbah ${existing.code}`,
    });

    return updated;
  });
}

export async function deleteOrArchiveWasteContainer(id: string, actorId: string) {
  const existing = await getWasteContainerById(id);

  // Check if there are any disposal logs associated
  const [logCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wasteDisposalLog)
    .where(eq(wasteDisposalLog.containerId, id));

  const hasLogs = (logCount?.count ?? 0) > 0;

  return db.transaction(async (tx) => {
    if (!hasLogs) {
      // Hard delete if never used
      await tx.delete(wasteContainer).where(eq(wasteContainer.id, id));
      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "waste_container",
        entityId: id,
        before: existing,
        reason: `Menghapus jerigen ${existing.code} (belum pernah ada transaksi limbah)`,
      });
      return { action: "DELETED", id };
    } else {
      // Soft delete / archive to protect audit logs
      const [archived] = await tx
        .update(wasteContainer)
        .set({ active: false, status: "ARCHIVED" })
        .where(eq(wasteContainer.id, id))
        .returning();

      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "waste_container",
        entityId: id,
        before: existing,
        after: archived,
        reason: `Mengarsipkan jerigen ${existing.code} (sudah memiliki riwayat log)`,
      });
      return { action: "ARCHIVED", id };
    }
  });
}

export async function sealWasteContainer(id: string, actorId: string) {
  const result = await sealAndRolloverContainer(id, { createNew: false }, actorId);
  return result.sealed;
}

export async function sealAndRolloverContainer(
  id: string,
  input: SealAndRolloverInput,
  actorId: string,
) {
  const existing = await getWasteContainerById(id);
  if (existing.status === "SEALED" || existing.status === "IN_TPS" || existing.status === "DISPOSED") {
    throw new ApiError(400, "ALREADY_SEALED", "Wadah ini sudah disegel atau diproses.");
  }

  return db.transaction(async (tx) => {
    // 1. Seal existing container
    const [sealed] = await tx
      .update(wasteContainer)
      .set({ status: "SEALED", closedAt: new Date() })
      .where(eq(wasteContainer.id, id))
      .returning();

    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "waste_container",
      entityId: id,
      before: existing,
      after: sealed,
      reason: `Menyegel wadah limbah ${existing.code} (${existing.name})`,
    });

    let newContainer = null;
    if (input.createNew) {
      let baseName = existing.name;
      const match = baseName.match(/^(.*?)\s*#(\d+)$/);
      let nextNumber = 2;
      if (match) {
        baseName = match[1];
        nextNumber = parseInt(match[2], 10) + 1;
      }
      const newName = input.newName || `${baseName} #${nextNumber}`;
      const code = `JRG-${existing.roomCode.toUpperCase()}-${existing.categoryCode.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const qrCode = `reaksan://waste-container/${code}`;

      const [created] = await tx
        .insert(wasteContainer)
        .values({
          code,
          roomId: existing.roomId,
          categoryId: existing.categoryId,
          name: newName,
          maxCapacity: existing.maxCapacity,
          currentVolume: "0.00",
          unit: existing.unit,
          status: "ACTIVE",
          active: true,
          qrCode,
          locationNotes: existing.locationNotes,
        })
        .returning();

      await writeAudit(tx, {
        actorId,
        action: "CREATE",
        entityType: "waste_container",
        entityId: created.id,
        after: created,
        reason: `Rollover wadah baru ${created.code} (${created.name}) menggantikan ${existing.code}`,
      });

      newContainer = created;
    }

    return { sealed, newContainer };
  });
}

export async function moveContainersToTps(
  input: MoveToTpsInput,
  actorId: string,
) {
  if (input.containerIds.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "Pilih minimal 1 wadah untuk dipindahkan.");
  }

  return db.transaction(async (tx) => {
    const containers = await tx
      .select()
      .from(wasteContainer)
      .where(inArray(wasteContainer.id, input.containerIds));

    for (const c of containers) {
      if (c.status !== "SEALED") {
        throw new ApiError(
          400,
          "INVALID_STATUS",
          `Wadah ${c.code} belum disegel. Hanya wadah berstatus SEALED yang dapat dipindahkan ke TPS B3.`,
        );
      }
    }

    const now = new Date();
    const updated = await tx
      .update(wasteContainer)
      .set({
        status: "IN_TPS",
        tpsMovedAt: now,
      })
      .where(inArray(wasteContainer.id, input.containerIds))
      .returning();

    for (const u of updated) {
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "waste_container",
        entityId: u.id,
        after: u,
        reason: `Memindahkan jerigen ${u.code} ke TPS B3 Kampus. ${input.notes || ""}`.trim(),
      });
    }

    return updated;
  });
}

export async function handoverContainersToManifest(
  input: CreateWasteManifestInput,
  actorId: string,
) {
  if (input.containerIds.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "Pilih minimal 1 wadah untuk diserahterimakan.");
  }

  return db.transaction(async (tx) => {
    const containers = await tx
      .select()
      .from(wasteContainer)
      .where(inArray(wasteContainer.id, input.containerIds));

    if (containers.length !== input.containerIds.length) {
      throw new ApiError(404, "NOT_FOUND", "Satu atau lebih wadah tidak ditemukan.");
    }

    for (const c of containers) {
      if (c.status !== "SEALED" && c.status !== "IN_TPS") {
        throw new ApiError(
          400,
          "INVALID_STATUS",
          `Wadah ${c.code} tidak dalam status SEALED atau IN_TPS.`,
        );
      }
    }

    let totalVolumeL = 0;
    let totalVolumeKg = 0;
    for (const c of containers) {
      const vol = Number(c.currentVolume) || 0;
      if (c.unit.toLowerCase() === "kg") totalVolumeKg += vol;
      else totalVolumeL += vol;
    }

    const year = new Date().getFullYear();
    const code = `MNF-${year}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date();

    const [manifest] = await tx
      .insert(wasteManifest)
      .values({
        code,
        manifestNumber: input.manifestNumber,
        transporterName: input.transporterName,
        driverName: input.driverName || null,
        vehiclePlate: input.vehiclePlate || null,
        picStaffId: actorId,
        handedOverAt: now,
        notes: input.notes || null,
        totalContainers: containers.length.toString(),
        totalVolumeL: totalVolumeL.toFixed(2),
        totalVolumeKg: totalVolumeKg.toFixed(2),
      })
      .returning();

    await tx
      .update(wasteContainer)
      .set({
        status: "DISPOSED",
        disposedAt: now,
        manifestId: manifest.id,
      })
      .where(inArray(wasteContainer.id, input.containerIds));

    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "waste_manifest",
      entityId: manifest.id,
      after: manifest,
      reason: `Serah terima ${containers.length} wadah limbah B3 ke vendor ${input.transporterName} (No. Manifest: ${input.manifestNumber})`,
    });

    return manifest;
  });
}

export async function listWasteManifests() {
  return db
    .select({
      id: wasteManifest.id,
      code: wasteManifest.code,
      manifestNumber: wasteManifest.manifestNumber,
      transporterName: wasteManifest.transporterName,
      driverName: wasteManifest.driverName,
      vehiclePlate: wasteManifest.vehiclePlate,
      picStaffId: wasteManifest.picStaffId,
      picStaffName: user.name,
      handedOverAt: wasteManifest.handedOverAt,
      notes: wasteManifest.notes,
      totalContainers: wasteManifest.totalContainers,
      totalVolumeL: wasteManifest.totalVolumeL,
      totalVolumeKg: wasteManifest.totalVolumeKg,
      createdAt: wasteManifest.createdAt,
    })
    .from(wasteManifest)
    .innerJoin(user, eq(user.id, wasteManifest.picStaffId))
    .orderBy(desc(wasteManifest.handedOverAt));
}

export async function batchVerifyWasteLogs(
  input: BatchVerifyWasteLogInput,
  actorId: string,
) {
  if (input.logIds.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "Pilih minimal 1 log untuk diverifikasi.");
  }

  return db.transaction(async (tx) => {
    const logs = await tx
      .select()
      .from(wasteDisposalLog)
      .where(inArray(wasteDisposalLog.id, input.logIds));

    const results = [];
    for (const log of logs) {
      if (log.status !== "LOGGED") continue;

      const [container] = await tx
        .select()
        .from(wasteContainer)
        .where(eq(wasteContainer.id, log.containerId))
        .limit(1);

      if (!container) continue;

      let updatedVolume = Number(container.currentVolume);
      if (input.status === "REJECTED") {
        updatedVolume = Math.max(0, updatedVolume - Number(log.quantity));
      }

      const [updatedLog] = await tx
        .update(wasteDisposalLog)
        .set({
          status: input.status,
          verifiedById: actorId,
          verifiedAt: new Date(),
          notes: input.notes
            ? `${log.notes ? `${log.notes} | ` : ""}${input.notes}`
            : log.notes,
        })
        .where(eq(wasteDisposalLog.id, log.id))
        .returning();

      if (input.status === "REJECTED") {
        await tx
          .update(wasteContainer)
          .set({ currentVolume: updatedVolume.toFixed(2) })
          .where(eq(wasteContainer.id, log.containerId));
      }

      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "waste_disposal_log",
        entityId: log.id,
        before: log,
        after: updatedLog,
        reason: `Batch verifikasi log limbah oleh PLP: ${input.status}`,
      });

      results.push(updatedLog);
    }

    return results;
  });
}

export async function recordWasteDisposal(
  input: LogWasteDisposalInput,
  studentId: string,
) {
  const container = await getWasteContainerById(input.containerId);

  if (!container.active || container.status !== "ACTIVE") {
    throw new ApiError(
      400,
      "CONTAINER_NOT_ACTIVE",
      "Wadah limbah ini sudah tidak aktif atau dalam status terkunci/disegel.",
    );
  }

  const year = new Date().getFullYear();
  const code = `WLOG-${year}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return db.transaction(async (tx) => {
    const [log] = await tx
      .insert(wasteDisposalLog)
      .values({
        code,
        containerId: input.containerId,
        requestId: input.requestId,
        studentId,
        quantity: input.quantity.toFixed(2),
        unit: input.unit || "L",
        chemicalDescription: input.chemicalDescription,
        notes: input.notes,
        status: "LOGGED",
      })
      .returning();

    // Update container volume
    const newVol = (Number(container.currentVolume) + input.quantity).toFixed(2);
    const maxCap = Number(container.maxCapacity);
    const isNowFull = Number(newVol) >= maxCap * 0.95;

    await tx
      .update(wasteContainer)
      .set({
        currentVolume: newVol,
        status: isNowFull ? "FULL" : container.status,
      })
      .where(eq(wasteContainer.id, input.containerId));

    await writeAudit(tx, {
      actorId: studentId,
      action: "CREATE",
      entityType: "waste_disposal_log",
      entityId: log.id,
      after: log,
      reason: `Pencatatan sisa limbah ${input.quantity} ${input.unit} ke wadah ${container.code}`,
    });

    return log;
  });
}

export async function verifyWasteLog(
  id: string,
  input: VerifyWasteLogInput,
  verifiedById: string,
) {
  const [log] = await db
    .select()
    .from(wasteDisposalLog)
    .where(eq(wasteDisposalLog.id, id))
    .limit(1);

  if (!log) throw new ApiError(404, "NOT_FOUND", "Log limbah tidak ditemukan.");
  if (log.status !== "LOGGED") {
    throw new ApiError(400, "ALREADY_VERIFIED", "Log limbah ini sudah diverifikasi sebelumnya.");
  }

  const container = await getWasteContainerById(log.containerId);

  return db.transaction(async (tx) => {
    const finalQuantity = input.quantity ?? Number(log.quantity);

    let updatedVolume = Number(container.currentVolume);
    if (input.status === "REJECTED") {
      // Deduct previously added volume
      updatedVolume = Math.max(0, updatedVolume - Number(log.quantity));
    } else if (input.quantity && input.quantity !== Number(log.quantity)) {
      // Adjust volume difference
      const diff = input.quantity - Number(log.quantity);
      updatedVolume = Math.max(0, updatedVolume + diff);
    }

    const [updatedLog] = await tx
      .update(wasteDisposalLog)
      .set({
        status: input.status,
        quantity: finalQuantity.toFixed(2),
        verifiedById,
        verifiedAt: new Date(),
        notes: input.notes ? `${log.notes ? `${log.notes} | ` : ""}${input.notes}` : log.notes,
      })
      .where(eq(wasteDisposalLog.id, id))
      .returning();

    await tx
      .update(wasteContainer)
      .set({
        currentVolume: updatedVolume.toFixed(2),
      })
      .where(eq(wasteContainer.id, log.containerId));

    await writeAudit(tx, {
      actorId: verifiedById,
      action: "UPDATE",
      entityType: "waste_disposal_log",
      entityId: id,
      before: log,
      after: updatedLog,
      reason: `Verifikasi log limbah oleh PLP: ${input.status}`,
    });

    return updatedLog;
  });
}

export async function listWasteLogs(
  roomCodes: string[] | null,
  query: WasteExportQuery,
) {
  const { from, to, label } = resolveDateRange(query);

  const conditions = [
    sql`${wasteDisposalLog.disposedAt} >= ${from.toISOString()}`,
    sql`${wasteDisposalLog.disposedAt} <= ${to.toISOString()}`,
  ];

  if (roomCodes !== null) {
    if (roomCodes.length === 0) return { logs: [], label, from, to };
    conditions.push(inArray(room.code, roomCodes));
  }

  if (query.room) {
    conditions.push(eq(room.code, query.room));
  }

  if (query.container) {
    conditions.push(eq(wasteContainer.code, query.container));
  }

  if (query.category) {
    conditions.push(eq(wasteCategory.code, query.category));
  }

  if (query.status) {
    conditions.push(eq(wasteDisposalLog.status, query.status));
  }

  const logs = await db
    .select({
      id: wasteDisposalLog.id,
      code: wasteDisposalLog.code,
      disposedAt: wasteDisposalLog.disposedAt,
      quantity: wasteDisposalLog.quantity,
      unit: wasteDisposalLog.unit,
      chemicalDescription: wasteDisposalLog.chemicalDescription,
      notes: wasteDisposalLog.notes,
      status: wasteDisposalLog.status,
      verifiedAt: wasteDisposalLog.verifiedAt,
      studentId: wasteDisposalLog.studentId,
      studentName: user.name,
      studentUsername: user.username,
      studentEmail: user.email,
      containerId: wasteContainer.id,
      containerCode: wasteContainer.code,
      containerName: wasteContainer.name,
      roomCode: room.code,
      roomName: room.name,
      categoryCode: wasteCategory.code,
      categoryName: wasteCategory.name,
      categoryHazardBadge: wasteCategory.hazardBadge,
      requestCode: resourceRequest.code,
    })
    .from(wasteDisposalLog)
    .innerJoin(wasteContainer, eq(wasteContainer.id, wasteDisposalLog.containerId))
    .innerJoin(room, eq(room.id, wasteContainer.roomId))
    .innerJoin(wasteCategory, eq(wasteCategory.id, wasteContainer.categoryId))
    .innerJoin(user, eq(user.id, wasteDisposalLog.studentId))
    .leftJoin(resourceRequest, eq(resourceRequest.id, wasteDisposalLog.requestId))
    .where(and(...conditions))
    .orderBy(desc(wasteDisposalLog.disposedAt));

  return { logs, label, from, to };
}

export async function getWasteSummary(
  roomCodes: string[] | null,
  query: WasteExportQuery,
) {
  const { logs, label, from, to } = await listWasteLogs(roomCodes, query);

  let totalVolumeL = 0;
  let totalVolumeKg = 0;
  const byCategory: Record<
    string,
    { name: string; badge: string | null; volumeL: number; count: number }
  > = {};

  for (const log of logs) {
    const q = Number(log.quantity) || 0;
    if (log.unit.toLowerCase() === "kg") totalVolumeKg += q;
    else totalVolumeL += q;

    if (!byCategory[log.categoryCode]) {
      byCategory[log.categoryCode] = {
        name: log.categoryName,
        badge: log.categoryHazardBadge,
        volumeL: 0,
        count: 0,
      };
    }
    byCategory[log.categoryCode].volumeL += q;
    byCategory[log.categoryCode].count += 1;
  }

  return {
    label,
    from,
    to,
    totalLogs: logs.length,
    totalVolumeL,
    totalVolumeKg,
    byCategory: Object.values(byCategory),
  };
}

export type WasteContainerRow = Awaited<ReturnType<typeof listWasteContainers>>[number];
export type WasteCategoryRow = Awaited<ReturnType<typeof listWasteCategories>>[number];
export type WasteLogRow = Awaited<ReturnType<typeof listWasteLogs>>["logs"][number];
export type WasteSummaryRow = Awaited<ReturnType<typeof getWasteSummary>>;
