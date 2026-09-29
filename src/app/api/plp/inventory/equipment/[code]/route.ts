import { ApiError, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { getPlpEquipmentDetail } from "@/services/plp.service";
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
