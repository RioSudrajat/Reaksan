import { readJson, withApiPermission } from "@/lib/api";
import { updateRolePermissions } from "@/services/permissions.service";
import { rolePermissionsInputSchema } from "@/validators/admin";
import { roles } from "@/lib/permissions";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ role: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { configuration: ["manage-any"] },
    async (session) => {
      const role = z
        .enum(Object.keys(roles) as [string, ...string[]])
        .parse((await context.params).role);
      const input = rolePermissionsInputSchema.parse(await readJson(request));
      const updated = await updateRolePermissions(
        session.user.id,
        role,
        input.permissions,
      );
      return Response.json({
        data: {
          role: updated.name,
          permissions: updated.permissions,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    },
  );
}
