import { readJson, withApiPermission } from "@/lib/api";
import { createRoom, listRoomsAdmin } from "@/services/admin.service";
import { roomInputSchema } from "@/validators/admin";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { rooms: ["manage-any"] }, async () =>
    Response.json({ data: await listRoomsAdmin() }),
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { rooms: ["manage-any"] },
    async (session) => {
      const input = roomInputSchema.parse(await readJson(request));
      return Response.json(
        { data: await createRoom(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
