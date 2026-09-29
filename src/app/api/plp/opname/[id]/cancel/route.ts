import { withApiPermission } from "@/lib/api";
import {
  assertOpnameInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { cancelOpnameSession } from "@/services/opname.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const id = z
        .string()
        .uuid()
        .parse((await context.params).id);
      const { scope } = await scopeForSession(session);
      await assertOpnameInScope(scope, id);
      return Response.json({
        data: await cancelOpnameSession(session.user.id, id),
      });
    },
  );
}
