import { readJson, withApiPermission } from "@/lib/api";
import {
  assertOpnameInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { reconcileOpnameDiscrepancies } from "@/services/opname.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const reconcileInputSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .default({});

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z
        .string()
        .uuid()
        .parse((await context.params).id);
      const json = await readJson(request).catch(() => ({}));
      const input = reconcileInputSchema.parse(json);
      const { scope } = await scopeForSession(session);
      await assertOpnameInScope(scope, id);
      return Response.json({
        data: await reconcileOpnameDiscrepancies(session.user.id, id, input),
      });
    },
  );
}
