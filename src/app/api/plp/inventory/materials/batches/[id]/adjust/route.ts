import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { adjustPlpMaterialStock } from "@/services/plp.service";
import { plpStockAdjustInputSchema } from "@/validators/plp";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = plpStockAdjustInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      const updated = await adjustPlpMaterialStock(
        session.user.id,
        scope,
        id,
        input,
      );
      return Response.json({ data: updated });
    },
  );
}
