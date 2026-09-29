import { readJson, withApiPermission } from "@/lib/api";
import {
  assertRequestInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { reviewRequest } from "@/services/requests.service";
import {
  requestIdSchema,
  reviewRequestSchema,
} from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { requests: ["review-any"] },
    async (session) => {
      const id = requestIdSchema.parse((await context.params).id);
      const input = reviewRequestSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertRequestInScope(scope, id);
      return Response.json({
        data: await reviewRequest(
          session.user.id,
          id,
          input.action,
          input.note,
        ),
      });
    },
  );
}
