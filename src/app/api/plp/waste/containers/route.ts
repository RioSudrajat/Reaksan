import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import {
  createWasteContainer,
  listWasteContainers,
} from "@/services/waste.service";
import { createWasteContainerSchema } from "@/validators/waste";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { waste: ["read-any"] },
    async (session) => {
      const { roomCodes } = await scopeForSession(session);
      const url = new URL(request.url);
      const roomId = url.searchParams.get("roomId") || undefined;
      const status = url.searchParams.get("status") || undefined;

      const containers = await listWasteContainers(roomCodes, {
        roomId,
        status,
        activeOnly: true,
      });

      return Response.json({ data: containers });
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const body = await readJson(request);
      const input = createWasteContainerSchema.parse(body);

      const created = await createWasteContainer(input, session.user.id);
      return Response.json({ data: created }, { status: 201 });
    },
  );
}
