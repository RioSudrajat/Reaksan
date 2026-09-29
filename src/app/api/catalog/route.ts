import { ApiError, withApiSession } from "@/lib/api";
import { db } from "@/db";
import {
  buildEquipmentViews,
  buildLabCatalog,
  buildMaterialViews,
  buildRoomViews,
  findRoomByCode,
} from "@/services/catalog.service";
import { roomQuerySchema } from "@/validators/catalog";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async () => {
    const query = roomQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.room)
      return Response.json({ data: await buildLabCatalog() });
    const room = await findRoomByCode(db, query.room);
    if (!room) throw new ApiError(404, "NOT_FOUND", "Room not found.");
    const [rooms, equipment, materials] = await Promise.all([
      buildRoomViews(db),
      buildEquipmentViews(db, { roomCode: query.room }),
      buildMaterialViews(db, { roomCode: query.room }),
    ]);
    return Response.json({ data: { rooms, equipment, materials } });
  });
}
