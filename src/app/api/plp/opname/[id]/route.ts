import { ApiError, withApiPermission } from "@/lib/api";
import { assertOpnameInScope, scopeForSession } from "@/services/access-scope.service";
import { getOpnameSessionDetail } from "@/services/opname.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
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
      const detail = await getOpnameSessionDetail(id);
      if (!detail)
        throw new ApiError(404, "NOT_FOUND", "Sesi hitung tidak ditemukan.");
      return Response.json({ data: detail });
    },
  );
}
