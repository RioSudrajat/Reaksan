import { ApiError, withApiPermission } from "@/lib/api";
import { getRoomScope, scopeForSession } from "@/services/access-scope.service";
import { deletePlpEquipmentAsset, getPlpEquipmentDetail } from "@/services/plp.service";
import { entityCodeSchema } from "@/validators/catalog";

export const runtime = "nodejs";
type Context = { params: Promise<{ code: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["read-any"] },
    async (session) => {
      const code = entityCodeSchema.parse((await context.params).code);
      const { roomCodes } = await scopeForSession(session);
      const found = await getPlpEquipmentDetail(code, roomCodes);
      if (!found) throw new ApiError(404, "NOT_FOUND", "Asset not found.");
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
      const scope = await getRoomScope(session.user.id, session.user.role);
      const result = await deletePlpEquipmentAsset(session.user.id, scope, code);
      return Response.json({ data: result });
    },
  );
}

