import { readJson, withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { confirmAndCompleteReturn } from "@/services/requests.service";
import { confirmReturnSchema, requestIdSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["return-any"] },
    async (session) => {
      const id = requestIdSchema.parse((await context.params).id);
      const input = confirmReturnSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({
        data: await confirmAndCompleteReturn(session.user.id, id, input),
      });
    },
  );
}
