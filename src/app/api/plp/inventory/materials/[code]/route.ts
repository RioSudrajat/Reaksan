import { ApiError, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { deletePlpMaterial, getPlpMaterialDetail } from "@/services/plp.service";
import { entityCodeSchema } from "@/validators/catalog";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ code: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["read-any"] },
    async (session) => {
      const code = entityCodeSchema.parse((await context.params).code);
      const room = z
        .string()
        .trim()
        .max(64)
        .optional()
        .parse(new URL(request.url).searchParams.get("room") ?? undefined);
      const { roomCodes } = await scopeForSession(session);
      const found = await getPlpMaterialDetail(code, { room, roomCodes });
      if (!found) throw new ApiError(404, "NOT_FOUND", "Material not found.");
      return Response.json({ data: found });
    },
  );
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const code = entityCodeSchema.parse((await context.params).code);
      const result = await deletePlpMaterial(session.user.id, code);
      return Response.json({ data: result });
    },
  );
}

