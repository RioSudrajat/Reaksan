import { readJson, withApiPermission } from "@/lib/api";
import {
  createEquipmentAsset,
  listEquipmentAssetsAdmin,
} from "@/services/admin.service";
import { setEquipmentAssetImage } from "@/services/media.service";
import { equipmentAssetInputSchema } from "@/validators/admin";
import { imageMediaIdSchema } from "@/validators/media";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { equipment: ["manage-any"] }, async () =>
    Response.json({ data: await listEquipmentAssetsAdmin() }),
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { equipment: ["manage-any"] },
    async (session) => {
      const raw = (await readJson(request)) as Record<string, unknown>;
      const imageMediaId = imageMediaIdSchema.parse(raw.imageMediaId);
      const rest: Record<string, unknown> = { ...raw };
      delete rest.imageMediaId;
      const input = equipmentAssetInputSchema.parse(rest);
      const created = await createEquipmentAsset(session.user.id, input);
      const data =
        imageMediaId !== undefined
          ? await setEquipmentAssetImage(
              session.user.id,
              created.id,
              imageMediaId,
            )
          : created;
      return Response.json({ data }, { status: 201 });
    },
  );
}
