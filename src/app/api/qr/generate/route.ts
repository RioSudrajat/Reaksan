import { z } from "zod";
import { withApiSession, ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/session";
import {
  generateUnitQrCode,
  generateAssetQrCode,
  generateBatchQrCode,
  bulkGenerateMissingQrCodes,
} from "@/services/qr.service";

export const runtime = "nodejs";

const qrGenerateSchema = z.object({
  targetType: z.enum(["UNIT", "BATCH", "ASSET", "BULK"]),
  targetId: z.string().min(1).optional(),
  forceRegenerate: z.boolean().optional(),
  roomId: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  classification: z.string().optional().nullable(),
  storageLocation: z.string().optional().nullable(),
});

function checkQrAccess(user: { id: string; role?: string | null }) {
  const userRoles = user.role ? user.role.split(",").map((r) => r.trim().toLowerCase()) : [];
  return (
    userRoles.includes("plp") ||
    userRoles.includes("admin") ||
    userRoles.includes("superadmin") ||
    userRoles.includes("aslab")
  );
}

export async function GET(request: Request) {
  return withApiSession(request, async ({ user }) => {
    const isAuthorized =
      checkQrAccess(user) ||
      (await hasPermission(user.id, { inventory: ["read-any"] })) ||
      (await hasPermission(user.id, { inventory: ["manage-any"] })) ||
      (await hasPermission(user.id, { plp: ["view"] }));
    if (!isAuthorized) {
      throw new ApiError(403, "FORBIDDEN", "Hanya PLP atau Admin yang dapat mengelola QR Code.");
    }

    const url = new URL(request.url);
    const targetType = url.searchParams.get("targetType") ?? "UNIT";
    const targetId = url.searchParams.get("targetId") ?? url.searchParams.get("code") ?? "ITEM";
    const code = url.searchParams.get("code") ?? undefined;
    const name = url.searchParams.get("name") ?? undefined;
    const classification = url.searchParams.get("classification") ?? undefined;
    const storageLocation = url.searchParams.get("storageLocation") ?? undefined;

    if (targetType === "BATCH") {
      const result = await generateBatchQrCode(
        targetId,
        false,
        code,
        name,
        storageLocation,
      );
      return Response.json({ data: result });
    }

    if (targetType === "ASSET") {
      const result = await generateAssetQrCode(
        targetId,
        false,
        code,
        name,
        classification,
        storageLocation,
      );
      return Response.json({ data: result });
    }

    const result = await generateUnitQrCode(
      targetId,
      false,
      code,
      name,
      classification,
      storageLocation,
    );
    return Response.json({ data: result });
  });
}

export async function POST(request: Request) {
  return withApiSession(request, async ({ user }) => {
    const isAuthorized =
      checkQrAccess(user) ||
      (await hasPermission(user.id, { inventory: ["read-any"] })) ||
      (await hasPermission(user.id, { inventory: ["manage-any"] })) ||
      (await hasPermission(user.id, { plp: ["view"] }));
    if (!isAuthorized) {
      throw new ApiError(403, "FORBIDDEN", "Hanya PLP atau Admin yang dapat mengelola QR Code.");
    }

    const json = await request.json().catch(() => ({}));
    const parsed = qrGenerateSchema.parse(json);

    if (parsed.targetType === "BULK") {
      const result = await bulkGenerateMissingQrCodes(parsed.roomId);
      return Response.json({
        data: {
          success: true,
          message: `Berhasil generate ${result.unitsUpdated} unit dan ${result.batchesUpdated} batch.`,
          ...result,
        },
      });
    }

    const targetId = parsed.targetId || parsed.code;
    if (!targetId) {
      throw new ApiError(422, "VALIDATION_ERROR", "targetId atau code diperlukan untuk tipe UNIT, ASSET, atau BATCH.");
    }

    if (parsed.targetType === "ASSET") {
      const result = await generateAssetQrCode(
        targetId,
        parsed.forceRegenerate ?? false,
        parsed.code,
        parsed.name,
        parsed.classification,
        parsed.storageLocation,
      );
      return Response.json({ data: result });
    }

    if (parsed.targetType === "UNIT") {
      const result = await generateUnitQrCode(
        targetId,
        parsed.forceRegenerate ?? false,
        parsed.code,
        parsed.name,
        parsed.classification,
        parsed.storageLocation,
      );
      return Response.json({ data: result });
    }

    const result = await generateBatchQrCode(
      targetId,
      parsed.forceRegenerate ?? false,
      parsed.code,
      parsed.name,
      parsed.storageLocation,
    );
    return Response.json({ data: result });
  });
}
