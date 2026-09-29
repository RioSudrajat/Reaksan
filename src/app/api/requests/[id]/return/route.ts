import { readJson, withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { returnRequest } from "@/services/requests.service";
import {
  requestIdSchema,
  returnRequestSchema,
} from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["return-any"] },
    async (session) => {
      const id = requestIdSchema.parse((await context.params).id);
      const input = returnRequestSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({
        data: await returnRequest(session.user.id, id, input),
      });
    },
  );
}
