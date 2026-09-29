import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { listPlpMaterials } from "@/services/plp.service";
import { inventoryQuerySchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { inventory: ["read-any"] },
    async (session) => {
      const query = inventoryQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const { roomCodes } = await scopeForSession(session);
      return Response.json(
        await listPlpMaterials({
          room: query.room,
          roomCodes,
          stock: query.stock,
          search: query.search,
          limit: query.limit,
          offset: query.offset,
        }),
      );
    },
  );
}
