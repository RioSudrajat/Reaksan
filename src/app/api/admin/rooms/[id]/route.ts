import { readJson, withApiPermission } from "@/lib/api";
import { updateRoom } from "@/services/admin.service";
import { roomUpdateSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { rooms: ["manage-any"] },
    async (session) => {
      const id = z.string().uuid().parse((await context.params).id);
      const input = roomUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateRoom(session.user.id, id, input),
      });
    },
  );
}
