import { withApiPermission } from "@/lib/api";
import { deleteUserAccount } from "@/services/admin.service";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { user: ["delete"] },
    async (session) => {
      const id = z.string().min(1).parse((await context.params).id);
      const result = await deleteUserAccount(session.user.id, id);
      return Response.json({ data: result });
    },
  );
}
