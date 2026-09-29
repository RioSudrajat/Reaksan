import { readJson, withApiPermission } from "@/lib/api";
import { updateLaboratory } from "@/services/admin.service";
import { laboratoryUpdateSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { labs: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = laboratoryUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateLaboratory(session.user.id, id, input),
      });
    },
  );
}
