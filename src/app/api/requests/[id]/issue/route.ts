import { withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { issueRequest } from "@/services/requests.service";
import { requestIdSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["issue-any"] },
    async (session) => {
      const id = requestIdSchema.parse((await context.params).id);
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({
        data: await issueRequest(session.user.id, id),
      });
    },
  );
}
