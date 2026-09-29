import "server-only";
import { and, asc, eq, lt, notExists, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { db } from "@/db";
import { equipmentAsset, equipmentType, material, media } from "@/db/schema";
import { deleteObject } from "@/lib/storage";
import type { DbExecutor } from "@/services/executor";
import { writeAudit } from "@/services/audit.service";

export type MediaEntity = "material" | "equipment_type" | "equipment_asset";

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
  const [materials, equipmentTypes, equipmentAssets] = await Promise.all([
    exec
      .select({ id: material.id, code: material.code, name: material.name })
      .from(material)
      .where(eq(material.imageMediaId, mediaId)),
    exec
      .select({ id: equipmentType.id, name: equipmentType.name })
      .from(equipmentType)
      .where(eq(equipmentType.imageMediaId, mediaId)),
    exec
      .select({ id: equipmentAsset.id, assetCode: equipmentAsset.assetCode })
      .from(equipmentAsset)
      .where(eq(equipmentAsset.imageMediaId, mediaId)),
  ]);
  return { materials, equipmentTypes, equipmentAssets };
}

function referenceCount(refs: Awaited<ReturnType<typeof findReferencingRows>>) {
  return (
    refs.materials.length +
    refs.equipmentTypes.length +
    refs.equipmentAssets.length
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
            .select({ id: equipmentType.id })
            .from(equipmentType)
            .where(eq(equipmentType.imageMediaId, media.id)),
        ),
        notExists(
          db
            .select({ id: equipmentAsset.id })
            .from(equipmentAsset)
            .where(eq(equipmentAsset.imageMediaId, media.id)),
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
) {
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
    if (entity === "equipment_type") {
      const [current] = await tx
        .select({ imageMediaId: equipmentType.imageMediaId })
        .from(equipmentType)
        .where(eq(equipmentType.id, id))
        .limit(1);
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Equipment type tidak ditemukan.");
      const [updated] = await tx
        .update(equipmentType)
        .set({ imageMediaId: mediaId })
        .where(eq(equipmentType.id, id))
        .returning();
      await writeAudit(tx, {
        actorId,
        action: "UPDATE",
        entityType: "equipment_type",
        entityId: id,
        before: { imageMediaId: current.imageMediaId },
        after: { imageMediaId: mediaId },
      });
      return updated;
    }
    const [current] = await tx
      .select({ imageMediaId: equipmentAsset.imageMediaId })
      .from(equipmentAsset)
      .where(eq(equipmentAsset.id, id))
      .limit(1);
    if (!current)
      throw new ApiError(404, "NOT_FOUND", "Equipment asset tidak ditemukan.");
    const [updated] = await tx
      .update(equipmentAsset)
      .set({ imageMediaId: mediaId })
      .where(eq(equipmentAsset.id, id))
      .returning();
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "equipment_asset",
      entityId: id,
      before: { imageMediaId: current.imageMediaId },
      after: { imageMediaId: mediaId },
    });
    return updated;
  });
}

export function setMaterialImage(
  actorId: string,
  materialId: string,
  mediaId: string | null,
) {
  return setMediaImage(actorId, "material", materialId, mediaId);
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
  const [materials, equipmentTypes, equipmentAssets] = await Promise.all([
    db
      .select({ id: material.id, imageMediaId: material.imageMediaId })
      .from(material),
    db
      .select({
        id: equipmentType.id,
        imageMediaId: equipmentType.imageMediaId,
      })
      .from(equipmentType),
    db
      .select({
        id: equipmentAsset.id,
        imageMediaId: sql<string | null>`COALESCE(${equipmentAsset.imageMediaId}, ${equipmentType.imageMediaId})`,
      })
      .from(equipmentAsset)
      .leftJoin(
        equipmentType,
        eq(equipmentAsset.equipmentTypeId, equipmentType.id),
      ),
  ]);
  return { materials, equipmentTypes, equipmentAssets };
}
