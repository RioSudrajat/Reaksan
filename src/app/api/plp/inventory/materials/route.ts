import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { createPlpMaterial, listPlpMaterials } from "@/services/plp.service";
import {
  inventoryQuerySchema,
  plpMaterialCreateInputSchema,
} from "@/validators/plp";

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

export function POST(request: Request) {
  return withApiPermission(
    request,
    { materials: ["manage-any"] },
    async (session) => {
      const input = plpMaterialCreateInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      const created = await createPlpMaterial(
        session.user.id,
        scope,
        input,
      );
      return Response.json({ data: created }, { status: 201 });
    },
  );
}
