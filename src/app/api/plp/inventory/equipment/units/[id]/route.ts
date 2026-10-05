import { readJson, withApiPermission } from "@/lib/api";
import { updateEquipmentUnit } from "@/services/admin.service";
import { deletePlpEquipmentUnit } from "@/services/plp.service";
import { getRoomScope } from "@/services/access-scope.service";
import { equipmentUnitUpdateSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = equipmentUnitUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateEquipmentUnit(session.user.id, id, input),
      });
    },
  );
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const scope = await getRoomScope(session.user.id, session.user.role);
      const result = await deletePlpEquipmentUnit(session.user.id, scope, id);
      return Response.json({ data: result });
    },
  );
}

