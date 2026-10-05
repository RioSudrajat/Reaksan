import { withApiPermission } from "@/lib/api";
import { getRoomScope } from "@/services/access-scope.service";
import { deletePlpMaterialBatch } from "@/services/plp.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const scope = await getRoomScope(session.user.id, session.user.role);
      const result = await deletePlpMaterialBatch(session.user.id, scope, id);
      return Response.json({ data: result });
    },
  );
}
