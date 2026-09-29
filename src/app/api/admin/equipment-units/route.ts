import { readJson, withApiPermission } from "@/lib/api";
import {
  createEquipmentUnit,
  listEquipmentUnitsAdmin,
} from "@/services/admin.service";
import { equipmentUnitInputSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";

const assetQuerySchema = z
  .object({ asset: z.string().trim().max(64).optional() })
  .strict();

export function GET(request: Request) {
  return withApiPermission(request, { equipment: ["manage-any"] }, async () => {
    const query = assetQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json({
      data: await listEquipmentUnitsAdmin(query.asset),
    });
  });
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { equipment: ["manage-any"] },
    async (session) => {
      const input = equipmentUnitInputSchema.parse(await readJson(request));
      return Response.json(
        { data: await createEquipmentUnit(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
