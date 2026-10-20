import "server-only";
import { and, asc, eq, lt, notExists, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import {
  instrumentAsset,
  instrumentType,
  material,
  media,
  toolAsset,
  toolType,
} from "@/db/schema";
import { deleteObject } from "@/lib/storage";
import type { DbExecutor } from "@/services/executor";
import { writeAudit } from "@/services/audit.service";

export type MediaEntity =
  | "material"
  | "instrument_type"
  | "instrument_asset"
  | "tool_type"
  | "tool_asset"
  | "equipment_type"
  | "equipment_asset";

export type CreateMediaInput = {
  storageProvider: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function createMedia(actorId: string, input: CreateMediaInput) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(media)
      .values({ ...input, uploadedById: actorId })
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "CREATE",
      entityType: "media",
      entityId: created.id,
      after: {
        fileName: created.fileName,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      },
    });
    return created;
  });
}

export async function getMediaRecord(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row;
}

export async function findReferencingRows(
  mediaId: string,
  exec: DbExecutor = db,
) {
  const [materials, instrumentTypes, instrumentAssets, toolTypes, toolAssets] =
    await Promise.all([
      exec
        .select({ id: material.id, code: material.code, name: material.name })
        .from(material)
        .where(eq(material.imageMediaId, mediaId)),
      exec
        .select({ id: instrumentType.id, name: instrumentType.name })
        .from(instrumentType)
        .where(eq(instrumentType.imageMediaId, mediaId)),
      exec
        .select({
          id: instrumentAsset.id,
          assetCode: instrumentAsset.assetCode,
        })
        .from(instrumentAsset)
        .where(eq(instrumentAsset.imageMediaId, mediaId)),
      exec
        .select({ id: toolType.id, name: toolType.name })
        .from(toolType)
        .where(eq(toolType.imageMediaId, mediaId)),
      exec
        .select({ id: toolAsset.id, assetCode: toolAsset.assetCode })
        .from(toolAsset)
        .where(eq(toolAsset.imageMediaId, mediaId)),
    ]);
  return {
    materials,
    instrumentTypes,
    instrumentAssets,
    toolTypes,
    toolAssets,
    equipmentTypes: [...instrumentTypes, ...toolTypes],
    equipmentAssets: [...instrumentAssets, ...toolAssets],
  };
}

function referenceCount(refs: Awaited<ReturnType<typeof findReferencingRows>>) {
  return (
    refs.materials.length +
    refs.instrumentTypes.length +
    refs.instrumentAssets.length +
    refs.toolTypes.length +
    refs.toolAssets.length
  );
}

export async function deleteMedia(actorId: string, id: string) {
  const record = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1)
      .for("update");
    if (!row) throw new ApiError(404, "NOT_FOUND", "Gambar tidak ditemukan.");
    const refs = await findReferencingRows(id, tx);
    if (referenceCount(refs) > 0) {
      throw new ApiError(
        409,
        "MEDIA_IN_USE",
        "Gambar masih dipakai oleh katalog. Lepas dulu sebelum menghapus.",
      );
    }
    await tx.delete(media).where(eq(media.id, id));
    await writeAudit(tx, {
      actorId,
      action: "DELETE",
      entityType: "media",
      entityId: id,
      before: { fileName: row.fileName, storageKey: row.storageKey },
    });
    return row;
  });
  try {
    await deleteObject(record.storageKey);
  } catch (error) {
    console.error(
      "Media object cleanup failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
  return record;
}

// Orphan cleanup is bounded and conservative: only files older than 24 hours
// that no catalog row references are removed.
export async function cleanupOrphanMedia(actorId: string) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphans = await db
    .select()
    .from(media)
    .where(
      and(
        lt(media.createdAt, cutoff),
        notExists(
          db
            .select({ id: material.id })
            .from(material)
            .where(eq(material.imageMediaId, media.id)),
        ),
        notExists(
          db
            .select({ id: instrumentType.id })
            .from(instrumentType)
            .where(eq(instrumentType.imageMediaId, media.id)),
        ),
        notExists(
          db
            .select({ id: instrumentAsset.id })
            .from(instrumentAsset)
            .where(eq(instrumentAsset.imageMediaId, media.id)),
        ),
        notExists(
          db
            .select({ id: toolType.id })
            .from(toolType)
            .where(eq(toolType.imageMediaId, media.id)),
        ),
        notExists(
          db
            .select({ id: toolAsset.id })
            .from(toolAsset)
            .where(eq(toolAsset.imageMediaId, media.id)),
        ),
      ),
    )
    .orderBy(asc(media.createdAt))
    .limit(100);
  if (orphans.length === 0) return 0;

  const removedKeys = await db.transaction(async (tx) => {
    for (const row of orphans) {
      await tx.delete(media).where(eq(media.id, row.id));
      await writeAudit(tx, {
        actorId,
        action: "DELETE",
        entityType: "media",
        entityId: row.id,
        before: { fileName: row.fileName, storageKey: row.storageKey },
        reason: "Pembersihan gambar yatim",
      });
    }
    return orphans.map((row) => row.storageKey);
  });

  for (const key of removedKeys) {
    try {
      await deleteObject(key);
    } catch (error) {
      console.error(
        "Orphan media object cleanup failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }
  return removedKeys.length;
}

export async function setMediaImage(
  actorId: string,
  entity: MediaEntity,
  id: string,
  mediaId: string | null,
): Promise<unknown> {
  if (mediaId) {
    const record = await getMediaRecord(mediaId);
    if (!record)
      throw new ApiError(404, "NOT_FOUND", "Gambar tidak ditemukan.");
  }
  return db.transaction(async (tx) => {
    if (entity === "material") {
      const [current] = await tx
        .select({ imageMediaId: material.imageMediaId })
        .from(material)
        .where(eq(material.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Material tidak ditemukan.");
      const [updated] = await tx
        .update(material)
        .set({ imageMediaId: mediaId })
        .where(eq(material.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "material",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }
    if (entity === "instrument_type") {
      const [current] = await tx
        .select({ imageMediaId: instrumentType.imageMediaId })
        .from(instrumentType)
        .where(eq(instrumentType.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Tipe instrumen tidak ditemukan.");
      const [updated] = await tx
        .update(instrumentType)
        .set({ imageMediaId: mediaId })
        .where(eq(instrumentType.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "instrument_type",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }
    if (entity === "tool_type") {
      const [current] = await tx
        .select({ imageMediaId: toolType.imageMediaId })
        .from(toolType)
        .where(eq(toolType.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Tipe alat tidak ditemukan.");
      const [updated] = await tx
        .update(toolType)
        .set({ imageMediaId: mediaId })
        .where(eq(toolType.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "tool_type",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }
    if (entity === "instrument_asset") {
      const [current] = await tx
        .select({ imageMediaId: instrumentAsset.imageMediaId })
        .from(instrumentAsset)
        .where(eq(instrumentAsset.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Aset instrumen tidak ditemukan.");
      const [updated] = await tx
        .update(instrumentAsset)
        .set({ imageMediaId: mediaId })
        .where(eq(instrumentAsset.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "instrument_asset",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }
    if (entity === "tool_asset") {
      const [current] = await tx
        .select({ imageMediaId: toolAsset.imageMediaId })
        .from(toolAsset)
        .where(eq(toolAsset.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Aset alat tidak ditemukan.");
      const [updated] = await tx
        .update(toolAsset)
        .set({ imageMediaId: mediaId })
        .where(eq(toolAsset.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "tool_asset",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }

    // Legacy fallback for equipment_type and equipment_asset:
    if (entity === "equipment_type") {
      const [inst] = await tx
        .select({ id: instrumentType.id })
        .from(instrumentType)
        .where(eq(instrumentType.id, id))
        .limit(1);
      if (inst) {
        return setMediaImage(actorId, "instrument_type", id, mediaId);
      }
      return setMediaImage(actorId, "tool_type", id, mediaId);
    }

    const [instAsset] = await tx
      .select({ id: instrumentAsset.id })
      .from(instrumentAsset)
      .where(eq(instrumentAsset.id, id))
      .limit(1);
    if (instAsset) {
      return setMediaImage(actorId, "instrument_asset", id, mediaId);
    }
    return setMediaImage(actorId, "tool_asset", id, mediaId);
  });
}

export function setMaterialImage(
  actorId: string,
  materialId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "material", materialId, mediaId);
}

export function setInstrumentTypeImage(
  actorId: string,
  instrumentTypeId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "instrument_type", instrumentTypeId, mediaId);
}

export function setInstrumentAssetImage(
  actorId: string,
  instrumentAssetId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "instrument_asset", instrumentAssetId, mediaId);
}

export function setToolTypeImage(
  actorId: string,
  toolTypeId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "tool_type", toolTypeId, mediaId);
}

export function setToolAssetImage(
  actorId: string,
  toolAssetId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "tool_asset", toolAssetId, mediaId);
}

export function setEquipmentTypeImage(
  actorId: string,
  equipmentTypeId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "equipment_type", equipmentTypeId, mediaId);
}

export function setEquipmentAssetImage(
  actorId: string,
  equipmentAssetId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "equipment_asset", equipmentAssetId, mediaId);
}

// Catalog pages use these maps because the shared admin list services do not
// select the new image column.
export async function listCatalogImageRefs() {
  const [materials, instrumentTypes, toolTypes, instrumentAssets, toolAssets] =
    await Promise.all([
      db
        .select({ id: material.id, imageMediaId: material.imageMediaId })
        .from(material),
      db
        .select({
          id: instrumentType.id,
          imageMediaId: instrumentType.imageMediaId,
        })
        .from(instrumentType),
      db
        .select({
          id: toolType.id,
          imageMediaId: toolType.imageMediaId,
        })
        .from(toolType),
      db
        .select({
          id: instrumentAsset.id,
          imageMediaId: sql<
            string | null
          >`COALESCE(${instrumentAsset.imageMediaId}, ${instrumentType.imageMediaId})`,
        })
        .from(instrumentAsset)
        .leftJoin(
          instrumentType,
          eq(instrumentAsset.instrumentTypeId, instrumentType.id),
        ),
      db
        .select({
          id: toolAsset.id,
          imageMediaId: sql<
            string | null
          >`COALESCE(${toolAsset.imageMediaId}, ${toolType.imageMediaId})`,
        })
        .from(toolAsset)
        .leftJoin(toolType, eq(toolAsset.toolTypeId, toolType.id)),
    ]);

  return {
    materials,
    instrumentTypes,
    toolTypes,
    instrumentAssets,
    toolAssets,
    equipmentTypes: [...instrumentTypes, ...toolTypes],
    equipmentAssets: [...instrumentAssets, ...toolAssets],
  };
}
