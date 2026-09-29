import { readJson, withApiPermission } from "@/lib/api";
import { updateMaterialBatch } from "@/services/admin.service";
import { materialBatchUpdateSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { materials: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = materialBatchUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateMaterialBatch(session.user.id, id, input),
      });
    },
  );
}
