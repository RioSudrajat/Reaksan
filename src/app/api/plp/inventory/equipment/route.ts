import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import {
  createPlpEquipmentAsset,
  listPlpEquipment,
} from "@/services/plp.service";
import {
  inventoryQuerySchema,
  plpEquipmentAssetInputSchema,
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
        await listPlpEquipment({ ...query, roomCodes }),
      );
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const input = plpEquipmentAssetInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      const created = await createPlpEquipmentAsset(
        session.user.id,
        scope,
        input,
      );
      return Response.json({ data: created }, { status: 201 });
    },
  );
}

