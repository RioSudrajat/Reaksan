import "server-only";
import QRCode from "qrcode";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { equipmentUnit, equipmentAsset, equipmentType, materialBatch, material, stockOpnameEntry } from "@/db/schema";

export type QrTargetType = "UNIT" | "BATCH" | "ASSET";

export async function generateQrSvg(text: string): Promise<string> {
  return await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    width: 256,
    color: {
      dark: "#212121",
      light: "#FFFFFF",
    },
  });
}

export async function generateUnitQrCode(
  unitId: string,
  forceRegenerate = false,
  fallbackCode?: string,
  fallbackName?: string,
  fallbackClassification?: string | null,
  fallbackLocation?: string | null,
) {
  let units = await db
    .select({
      id: equipmentUnit.id,
      code: equipmentUnit.code,
      label: equipmentUnit.label,
      qrCode: equipmentUnit.qrCode,
      storageLocation: equipmentUnit.storageLocation,
      assetCode: equipmentAsset.assetCode,
      typeName: equipmentType.name,
      classification: equipmentType.classification,
    })
    .from(equipmentUnit)
    .innerJoin(equipmentAsset, eq(equipmentUnit.equipmentAssetId, equipmentAsset.id))
    .innerJoin(equipmentType, eq(equipmentAsset.equipmentTypeId, equipmentType.id))
    .where(eq(equipmentUnit.id, unitId))
    .limit(1);

  if (units.length === 0) {
    units = await db
      .select({
        id: equipmentUnit.id,
        code: equipmentUnit.code,
        label: equipmentUnit.label,
        qrCode: equipmentUnit.qrCode,
        storageLocation: equipmentUnit.storageLocation,
        assetCode: equipmentAsset.assetCode,
        typeName: equipmentType.name,
        classification: equipmentType.classification,
      })
      .from(equipmentUnit)
      .innerJoin(equipmentAsset, eq(equipmentUnit.equipmentAssetId, equipmentAsset.id))
      .innerJoin(equipmentType, eq(equipmentAsset.equipmentTypeId, equipmentType.id))
      .where(eq(equipmentUnit.code, unitId))
      .limit(1);
  }

  if (units.length === 0) {
    const [opEntry] = await db
      .select({
        id: stockOpnameEntry.id,
        equipmentAssetId: stockOpnameEntry.equipmentAssetId,
        equipmentUnitId: stockOpnameEntry.equipmentUnitId,
      })
      .from(stockOpnameEntry)
      .where(eq(stockOpnameEntry.id, unitId))
      .limit(1);

    if (opEntry?.equipmentAssetId) {
      return generateAssetQrCode(
        opEntry.equipmentAssetId,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        fallbackClassification,
        fallbackLocation,
      );
    }

    if (opEntry?.equipmentUnitId) {
      units = await db
        .select({
          id: equipmentUnit.id,
          code: equipmentUnit.code,
          label: equipmentUnit.label,
          qrCode: equipmentUnit.qrCode,
          storageLocation: equipmentUnit.storageLocation,
          assetCode: equipmentAsset.assetCode,
          typeName: equipmentType.name,
          classification: equipmentType.classification,
        })
        .from(equipmentUnit)
        .innerJoin(equipmentAsset, eq(equipmentUnit.equipmentAssetId, equipmentAsset.id))
        .innerJoin(equipmentType, eq(equipmentAsset.equipmentTypeId, equipmentType.id))
        .where(eq(equipmentUnit.id, opEntry.equipmentUnitId))
        .limit(1);
    }
  }

  // If still not found, check if unitId is an equipmentAsset directly
  if (units.length === 0) {
    const assets = await db
      .select({ id: equipmentAsset.id })
      .from(equipmentAsset)
      .where(or(eq(equipmentAsset.id, unitId), eq(equipmentAsset.assetCode, unitId)))
      .limit(1);
    if (assets.length > 0) {
      return generateAssetQrCode(
        assets[0].id,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        fallbackClassification,
        fallbackLocation,
      );
    }
  }

  if (units.length > 0) {
    const unit = units[0];
    let finalQrCode = unit.qrCode;

    if (!finalQrCode || forceRegenerate) {
      const suffix = forceRegenerate
        ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
        : "";
      finalQrCode = `RK-UNT-${unit.code}${suffix}`;

      await db
        .update(equipmentUnit)
        .set({
          qrCode: finalQrCode,
          updatedAt: new Date(),
        })
        .where(eq(equipmentUnit.id, unit.id));
    }

    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "UNIT" as const,
      id: unit.id,
      code: unit.code,
      name: unit.typeName,
      classification: unit.classification,
      storageLocation: unit.storageLocation ?? "Belum ditentukan",
      qrCode: finalQrCode,
      svg,
    };
  }

  const code = fallbackCode ?? `UNT-${unitId.slice(0, 8).toUpperCase()}`;
  const suffix = forceRegenerate
    ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
    : "";
  const finalQrCode = `RK-UNT-${code}${suffix}`;
  const svg = await generateQrSvg(finalQrCode);

  return {
    targetType: "UNIT" as const,
    id: unitId,
    code,
    name: fallbackName ?? "Alat / Instrumen",
    classification: fallbackClassification ?? "TOOL",
    storageLocation: fallbackLocation ?? "Belum ditentukan",
    qrCode: finalQrCode,
    svg,
  };
}

export async function generateAssetQrCode(
  assetId: string,
  forceRegenerate = false,
  fallbackCode?: string,
  fallbackName?: string,
  fallbackClassification?: string | null,
  fallbackLocation?: string | null,
) {
  const assets = await db
    .select({
      id: equipmentAsset.id,
      assetCode: equipmentAsset.assetCode,
      serialNumber: equipmentAsset.serialNumber,
      typeName: equipmentType.name,
      classification: equipmentType.classification,
    })
    .from(equipmentAsset)
    .innerJoin(
      equipmentType,
      eq(equipmentAsset.equipmentTypeId, equipmentType.id),
    )
    .where(
      or(eq(equipmentAsset.id, assetId), eq(equipmentAsset.assetCode, assetId)),
    )
    .limit(1);

  if (assets.length > 0) {
    const asset = assets[0];
    const suffix = forceRegenerate
      ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
      : "";
    const finalQrCode = `RK-AST-${asset.assetCode}${suffix}`;
    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "ASSET" as const,
      id: asset.id,
      code: asset.assetCode,
      name: asset.typeName,
      classification: asset.classification,
      storageLocation:
        fallbackLocation ??
        (asset.classification === "TOOL"
          ? "Meja Praktikum 1-4"
          : "Gudang Instrumen"),
      qrCode: finalQrCode,
      svg,
    };
  }

  const code = fallbackCode ?? `AST-${assetId.slice(0, 8).toUpperCase()}`;
  const suffix = forceRegenerate
    ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
    : "";
  const finalQrCode = `RK-AST-${code}${suffix}`;
  const svg = await generateQrSvg(finalQrCode);

  return {
    targetType: "ASSET" as const,
    id: assetId,
    code,
    name: fallbackName ?? "Katalog Alat / Instrumen",
    classification: fallbackClassification ?? "TOOL",
    storageLocation: fallbackLocation ?? "Belum ditentukan",
    qrCode: finalQrCode,
    svg,
  };
}

export async function generateBatchQrCode(
  batchId: string,
  forceRegenerate = false,
  fallbackCode?: string,
  fallbackName?: string,
  fallbackLocation?: string | null,
) {
  let batches = await db
    .select({
      id: materialBatch.id,
      lotNumber: materialBatch.lotNumber,
      qrCode: materialBatch.qrCode,
      storageLocation: materialBatch.storageLocation,
      materialCode: material.code,
      materialName: material.name,
      baseUnit: material.baseUnit,
    })
    .from(materialBatch)
    .innerJoin(material, eq(materialBatch.materialId, material.id))
    .where(eq(materialBatch.id, batchId))
    .limit(1);

  if (batches.length === 0) {
    batches = await db
      .select({
        id: materialBatch.id,
        lotNumber: materialBatch.lotNumber,
        qrCode: materialBatch.qrCode,
        storageLocation: materialBatch.storageLocation,
        materialCode: material.code,
        materialName: material.name,
        baseUnit: material.baseUnit,
      })
      .from(materialBatch)
      .innerJoin(material, eq(materialBatch.materialId, material.id))
      .where(eq(materialBatch.lotNumber, batchId))
      .limit(1);
  }

  if (batches.length === 0) {
    const [opEntry] = await db
      .select({
        id: stockOpnameEntry.id,
        materialBatchId: stockOpnameEntry.materialBatchId,
      })
      .from(stockOpnameEntry)
      .where(eq(stockOpnameEntry.id, batchId))
      .limit(1);
    if (opEntry?.materialBatchId) {
      batches = await db
        .select({
          id: materialBatch.id,
          lotNumber: materialBatch.lotNumber,
          qrCode: materialBatch.qrCode,
          storageLocation: materialBatch.storageLocation,
          materialCode: material.code,
          materialName: material.name,
          baseUnit: material.baseUnit,
        })
        .from(materialBatch)
        .innerJoin(material, eq(materialBatch.materialId, material.id))
        .where(eq(materialBatch.id, opEntry.materialBatchId))
        .limit(1);
    }
  }

  if (batches.length > 0) {
    const batch = batches[0];
    let finalQrCode = batch.qrCode;

    if (!finalQrCode || forceRegenerate) {
      const lotPart = batch.lotNumber ?? batch.id.slice(0, 8).toUpperCase();
      const suffix = forceRegenerate
        ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
        : "";
      finalQrCode = `RK-MAT-${lotPart}${suffix}`;

      await db
        .update(materialBatch)
        .set({
          qrCode: finalQrCode,
          updatedAt: new Date(),
        })
        .where(eq(materialBatch.id, batch.id));
    }

    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "BATCH" as const,
      id: batch.id,
      code: batch.lotNumber ?? batch.materialCode,
      name: batch.materialName,
      classification: "MATERIAL" as const,
      storageLocation: batch.storageLocation ?? "Gudang Reagen",
      qrCode: finalQrCode,
      svg,
    };
  }

  const lotPart = fallbackCode ?? `LOT-${batchId.slice(0, 8).toUpperCase()}`;
  const suffix = forceRegenerate
    ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
    : "";
  const finalQrCode = `RK-MAT-${lotPart}${suffix}`;
  const svg = await generateQrSvg(finalQrCode);

  return {
    targetType: "BATCH" as const,
    id: batchId,
    code: lotPart,
    name: fallbackName ?? "Bahan Kimia",
    classification: "MATERIAL" as const,
    storageLocation: fallbackLocation ?? "Gudang Reagen",
    qrCode: finalQrCode,
    svg,
  };
}

export async function bulkGenerateMissingQrCodes(roomId?: string) {
  let unitsUpdated = 0;
  let batchesUpdated = 0;

  // Find units with missing QR code
  const missingUnits = await db
    .select({
      id: equipmentUnit.id,
      code: equipmentUnit.code,
    })
    .from(equipmentUnit)
    .innerJoin(equipmentAsset, eq(equipmentUnit.equipmentAssetId, equipmentAsset.id))
    .where(
      roomId
        ? eq(equipmentAsset.roomId, roomId)
        : isNull(equipmentUnit.qrCode),
    );

  for (const unit of missingUnits) {
    const code = `RK-UNT-${unit.code}`;
    await db
      .update(equipmentUnit)
      .set({ qrCode: code, updatedAt: new Date() })
      .where(eq(equipmentUnit.id, unit.id));
    unitsUpdated += 1;
  }

  // Find batches with missing QR code
  const missingBatches = await db
    .select({
      id: materialBatch.id,
      lotNumber: materialBatch.lotNumber,
    })
    .from(materialBatch)
    .where(
      roomId
        ? eq(materialBatch.roomId, roomId)
        : isNull(materialBatch.qrCode),
    );

  for (const batch of missingBatches) {
    const lotPart = batch.lotNumber ?? batch.id.slice(0, 8).toUpperCase();
    const code = `RK-MAT-${lotPart}`;
    await db
      .update(materialBatch)
      .set({ qrCode: code, updatedAt: new Date() })
      .where(eq(materialBatch.id, batch.id));
    batchesUpdated += 1;
  }

  return { unitsUpdated, batchesUpdated };
}
