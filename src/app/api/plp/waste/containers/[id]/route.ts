import { readJson, withApiPermission } from "@/lib/api";
import {
  deleteOrArchiveWasteContainer,
  getWasteContainerById,
  updateWasteContainer,
} from "@/services/waste.service";
import { updateWasteContainerSchema } from "@/validators/waste";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext) {
  return withApiPermission(
    request,
    { waste: ["read-any"] },
    async () => {
      const { id } = await context.params;
      const container = await getWasteContainerById(id);
      return Response.json({ data: container });
    },
  );
}

export function PATCH(request: Request, context: RouteContext) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const { id } = await context.params;
      const body = await readJson(request);
      const input = updateWasteContainerSchema.parse(body);

      const updated = await updateWasteContainer(id, input, session.user.id);
      return Response.json({ data: updated });
    },
  );
}

export function DELETE(request: Request, context: RouteContext) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const { id } = await context.params;
      const result = await deleteOrArchiveWasteContainer(id, session.user.id);
      return Response.json({ data: result });
    },
  );
}
