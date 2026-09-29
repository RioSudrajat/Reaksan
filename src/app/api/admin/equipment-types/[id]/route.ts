import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { updateEquipmentType } from "@/services/admin.service";
import { setEquipmentTypeImage } from "@/services/media.service";
import { equipmentTypeUpdateSchema } from "@/validators/admin";
import { imageMediaIdSchema } from "@/validators/media";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { equipment: ["manage-any"] },
    async (session) => {
      const id = z
        .string()
        .uuid()
        .parse((await context.params).id);
      const raw = (await readJson(request)) as Record<string, unknown>;
      const imageMediaId = imageMediaIdSchema.parse(raw.imageMediaId);
      const rest: Record<string, unknown> = { ...raw };
      delete rest.imageMediaId;
      const hasRest = Object.keys(rest).length > 0;
      if (!hasRest && imageMediaId === undefined) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Change at least one field.",
        );
      }
      const updated = hasRest
        ? await updateEquipmentType(
            session.user.id,
            id,
            equipmentTypeUpdateSchema.parse(rest),
          )
        : null;
      const data =
        imageMediaId !== undefined
          ? await setEquipmentTypeImage(session.user.id, id, imageMediaId)
          : updated;
      return Response.json({ data });
    },
  );
}
