import { withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { getRequestReviewContext } from "@/services/requests.service";
import { requestIdParamSchema } from "@/validators/plp";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["read-any"] },
    async (session) => {
      const id = requestIdParamSchema.parse((await context.params).id);
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({ data: await getRequestReviewContext(id) });
    },
  );
}
