import { readJson, withApiPermission } from "@/lib/api";
import {
  assertOpnameInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { recordOpnameCount } from "@/services/opname.service";
import { opnameCountInputSchema } from "@/validators/opname";
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
      const input = opnameCountInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertOpnameInScope(scope, id);
      return Response.json({
        data: await recordOpnameCount(session.user.id, id, input),
      });
    },
  );
}
