import { readJson, withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { completeRequest } from "@/services/requests.service";
import { completeRequestSchema, requestIdParamSchema } from "@/validators/plp";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

// Completes a request after inspection (RETURNED) or after usage-only work
// (ACTIVE), releasing units and closing reservations.
export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["return-any"] },
    async (session) => {
      const id = requestIdParamSchema.parse((await context.params).id);
      const input = completeRequestSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({
        data: await completeRequest(session.user.id, id, input),
      });
    },
  );
}
