import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeRoleAudit } from "@/services/admin.service";
import { userRoleInputSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

// Role changes run through Better Auth's own endpoint (permission: user:set-role)
// so the plugin stays the source of truth, then the change is added to audit.
export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { user: ["set-role"] },
    async (session) => {
      const id = z.string().min(1).parse((await context.params).id);
      const input = userRoleInputSchema.parse(await readJson(request));
      const [target] = await db
        .select({ email: user.email, role: user.role })
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      if (!target)
        throw new ApiError(404, "NOT_FOUND", "User not found.");
      const result = await auth.api.setRole({
        body: { userId: id, role: input.roles },
        headers: request.headers,
      });
      await writeRoleAudit(
        session.user.id,
        id,
        input.roles.join(","),
        target.role ?? "",
      );
      return Response.json({ data: result });
    },
  );
}
