import { readJson, withApiPermission } from "@/lib/api";
import { createMaterial, listMaterialsAdmin } from "@/services/admin.service";
import { setMaterialImage } from "@/services/media.service";
import { materialInputSchema } from "@/validators/admin";
import { imageMediaIdSchema } from "@/validators/media";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { materials: ["manage-any"] }, async () =>
    Response.json({ data: await listMaterialsAdmin() }),
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { materials: ["manage-any"] },
    async (session) => {
      const raw = (await readJson(request)) as Record<string, unknown>;
      const imageMediaId = imageMediaIdSchema.parse(raw.imageMediaId);
      const rest: Record<string, unknown> = { ...raw };
      delete rest.imageMediaId;
      const input = materialInputSchema.parse(rest);
      const created = await createMaterial(session.user.id, input);
      const data =
        imageMediaId !== undefined
          ? await setMaterialImage(session.user.id, created.id, imageMediaId)
          : created;
      return Response.json({ data }, { status: 201 });
    },
  );
}
