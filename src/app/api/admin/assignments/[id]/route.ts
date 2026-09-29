import { readJson, withApiPermission } from "@/lib/api";
import { updateAssignment } from "@/services/admin.service";
import { assignmentUpdateSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { assignments: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = assignmentUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateAssignment(session.user.id, id, input),
      });
    },
  );
}
