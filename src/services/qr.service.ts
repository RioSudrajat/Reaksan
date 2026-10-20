import "server-only";
import QRCode from "qrcode";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  instrumentUnit,
  instrumentAsset,
  instrumentType,
  toolUnit,
  toolAsset,
  toolType,
  materialBatch,
  material,
  stockOpnameEntry,
} from "@/db/schema";

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
  // 1. Check instrumentUnit
  const instrumentRows = await db
    .select({
      id: instrumentUnit.id,
      code: instrumentUnit.code,
      label: instrumentUnit.label,
      qrCode: instrumentUnit.qrCode,
      storageLocation: instrumentUnit.storageLocation,
      assetCode: instrumentAsset.assetCode,
      typeName: instrumentType.name,
    })
    .from(instrumentUnit)
    .innerJoin(
      instrumentAsset,
      eq(instrumentUnit.instrumentAssetId, instrumentAsset.id),
    )
    .innerJoin(
      instrumentType,
      eq(instrumentAsset.instrumentTypeId, instrumentType.id),
    )
    .where(or(eq(instrumentUnit.id, unitId), eq(instrumentUnit.code, unitId)))
    .limit(1);

  if (instrumentRows.length > 0) {
    const unit = instrumentRows[0];
    let finalQrCode = unit.qrCode;

    if (!finalQrCode || forceRegenerate) {
      const suffix = forceRegenerate
        ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
        : "";
      finalQrCode = `RK-INS-${unit.code}${suffix}`;

      await db
        .update(instrumentUnit)
        .set({
          qrCode: finalQrCode,
          updatedAt: new Date(),
        })
        .where(eq(instrumentUnit.id, unit.id));
    }

    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "UNIT" as const,
      id: unit.id,
      code: unit.code,
      name: unit.typeName,
      classification: "INSTRUMENT" as const,
      storageLocation: unit.storageLocation ?? "Belum ditentukan",
      qrCode: finalQrCode,
      svg,
    };
  }

  // 2. Check toolUnit
  const toolRows = await db
    .select({
      id: toolUnit.id,
      code: toolUnit.code,
      label: toolUnit.label,
      qrCode: toolUnit.qrCode,
      storageLocation: toolUnit.storageLocation,
      assetCode: toolAsset.assetCode,
      typeName: toolType.name,
    })
    .from(toolUnit)
    .innerJoin(toolAsset, eq(toolUnit.toolAssetId, toolAsset.id))
    .innerJoin(toolType, eq(toolAsset.toolTypeId, toolType.id))
    .where(or(eq(toolUnit.id, unitId), eq(toolUnit.code, unitId)))
    .limit(1);

  if (toolRows.length > 0) {
    const unit = toolRows[0];
    let finalQrCode = unit.qrCode;

    if (!finalQrCode || forceRegenerate) {
      const suffix = forceRegenerate
        ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
        : "";
      finalQrCode = `RK-TOL-${unit.code}${suffix}`;

      await db
        .update(toolUnit)
        .set({
          qrCode: finalQrCode,
          updatedAt: new Date(),
        })
        .where(eq(toolUnit.id, unit.id));
    }

    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "UNIT" as const,
      id: unit.id,
      code: unit.code,
      name: unit.typeName,
      classification: "TOOL" as const,
      storageLocation: unit.storageLocation ?? "Belum ditentukan",
      qrCode: finalQrCode,
      svg,
    };
  }

  // 3. Check stockOpnameEntry if unitId is an opname entry id
  const [opEntry] = await db
    .select({
      id: stockOpnameEntry.id,
      instrumentAssetId: stockOpnameEntry.instrumentAssetId,
      instrumentUnitId: stockOpnameEntry.instrumentUnitId,
      toolAssetId: stockOpnameEntry.toolAssetId,
      toolUnitId: stockOpnameEntry.toolUnitId,
    })
    .from(stockOpnameEntry)
    .where(eq(stockOpnameEntry.id, unitId))
    .limit(1);

  if (opEntry) {
    if (opEntry.instrumentUnitId) {
      return generateUnitQrCode(
        opEntry.instrumentUnitId,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        "INSTRUMENT",
        fallbackLocation,
      );
    }
    if (opEntry.toolUnitId) {
      return generateUnitQrCode(
        opEntry.toolUnitId,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        "TOOL",
        fallbackLocation,
      );
    }
    if (opEntry.instrumentAssetId) {
      return generateAssetQrCode(
        opEntry.instrumentAssetId,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        "INSTRUMENT",
        fallbackLocation,
      );
    }
    if (opEntry.toolAssetId) {
      return generateAssetQrCode(
        opEntry.toolAssetId,
        forceRegenerate,
        fallbackCode,
        fallbackName,
        "TOOL",
        fallbackLocation,
      );
    }
  }

  // 4. Check if unitId is an asset directly
  const [instAsset] = await db
    .select({ id: instrumentAsset.id })
    .from(instrumentAsset)
    .where(
      or(eq(instrumentAsset.id, unitId), eq(instrumentAsset.assetCode, unitId)),
    )
    .limit(1);
  if (instAsset) {
    return generateAssetQrCode(
      instAsset.id,
      forceRegenerate,
      fallbackCode,
      fallbackName,
      "INSTRUMENT",
      fallbackLocation,
    );
  }

  const [tAsset] = await db
    .select({ id: toolAsset.id })
    .from(toolAsset)
    .where(or(eq(toolAsset.id, unitId), eq(toolAsset.assetCode, unitId)))
    .limit(1);
  if (tAsset) {
    return generateAssetQrCode(
      tAsset.id,
      forceRegenerate,
      fallbackCode,
      fallbackName,
      "TOOL",
      fallbackLocation,
    );
  }

  // Fallback
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
  // Check instrumentAsset
  const instAssets = await db
    .select({
      id: instrumentAsset.id,
      assetCode: instrumentAsset.assetCode,
      serialNumber: instrumentAsset.serialNumber,
      typeName: instrumentType.name,
    })
    .from(instrumentAsset)
    .innerJoin(
      instrumentType,
      eq(instrumentAsset.instrumentTypeId, instrumentType.id),
    )
    .where(
      or(
        eq(instrumentAsset.id, assetId),
        eq(instrumentAsset.assetCode, assetId),
      ),
    )
    .limit(1);

  if (instAssets.length > 0) {
    const asset = instAssets[0];
    const suffix = forceRegenerate
      ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
      : "";
    const finalQrCode = `RK-INS-AST-${asset.assetCode}${suffix}`;
    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "ASSET" as const,
      id: asset.id,
      code: asset.assetCode,
      name: asset.typeName,
      classification: "INSTRUMENT" as const,
      storageLocation: fallbackLocation ?? "Gudang Instrumen",
      qrCode: finalQrCode,
      svg,
    };
  }

  // Check toolAsset
  const toolAssets = await db
    .select({
      id: toolAsset.id,
      assetCode: toolAsset.assetCode,
      serialNumber: toolAsset.serialNumber,
      typeName: toolType.name,
    })
    .from(toolAsset)
    .innerJoin(toolType, eq(toolAsset.toolTypeId, toolType.id))
    .where(or(eq(toolAsset.id, assetId), eq(toolAsset.assetCode, assetId)))
    .limit(1);

  if (toolAssets.length > 0) {
    const asset = toolAssets[0];
    const suffix = forceRegenerate
      ? `-${Date.now().toString(36).slice(-4).toUpperCase()}`
      : "";
    const finalQrCode = `RK-TOL-AST-${asset.assetCode}${suffix}`;
    const svg = await generateQrSvg(finalQrCode);

    return {
      targetType: "ASSET" as const,
      id: asset.id,
      code: asset.assetCode,
      name: asset.typeName,
      classification: "TOOL" as const,
      storageLocation: fallbackLocation ?? "Meja Praktikum",
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

  // Find instrumentUnits with missing QR code
  const missingInstrumentUnits = await db
    .select({
      id: instrumentUnit.id,
      code: instrumentUnit.code,
    })
    .from(instrumentUnit)
    .innerJoin(
      instrumentAsset,
      eq(instrumentUnit.instrumentAssetId, instrumentAsset.id),
    )
    .where(
      roomId
        ? eq(instrumentAsset.roomId, roomId)
        : isNull(instrumentUnit.qrCode),
    );

  for (const unit of missingInstrumentUnits) {
    const code = `RK-INS-${unit.code}`;
    await db
      .update(instrumentUnit)
      .set({ qrCode: code, updatedAt: new Date() })
      .where(eq(instrumentUnit.id, unit.id));
    unitsUpdated += 1;
  }

  // Find toolUnits with missing QR code
  const missingToolUnits = await db
    .select({
      id: toolUnit.id,
      code: toolUnit.code,
    })
    .from(toolUnit)
    .innerJoin(toolAsset, eq(toolUnit.toolAssetId, toolAsset.id))
    .where(roomId ? eq(toolAsset.roomId, roomId) : isNull(toolUnit.qrCode));

  for (const unit of missingToolUnits) {
    const code = `RK-TOL-${unit.code}`;
    await db
      .update(toolUnit)
      .set({ qrCode: code, updatedAt: new Date() })
      .where(eq(toolUnit.id, unit.id));
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
      roomId ? eq(materialBatch.roomId, roomId) : isNull(materialBatch.qrCode),
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
