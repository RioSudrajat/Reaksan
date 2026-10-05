import { withApiPermission } from "@/lib/api";
import { deletePlpEquipmentType } from "@/services/plp.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const result = await deletePlpEquipmentType(session.user.id, id);
      return Response.json({ data: result });
    },
  );
}
