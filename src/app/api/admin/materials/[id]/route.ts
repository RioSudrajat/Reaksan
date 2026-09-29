import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { updateMaterial } from "@/services/admin.service";
import { setMaterialImage } from "@/services/media.service";
import { materialUpdateSchema } from "@/validators/admin";
import { imageMediaIdSchema } from "@/validators/media";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { materials: ["manage-any"] },
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
        ? await updateMaterial(session.user.id, id, materialUpdateSchema.parse(rest))
        : null;
      const data =
        imageMediaId !== undefined
          ? await setMaterialImage(session.user.id, id, imageMediaId)
          : updated;
      return Response.json({ data });
    },
  );
}
