import { withApiSession } from "@/lib/api";
import { listWasteContainers } from "@/services/waste.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async () => {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId") || undefined;
    const roomCode = url.searchParams.get("roomCode") || undefined;

    // Students only need to see ACTIVE containers
    const containers = await listWasteContainers(null, {
      roomId,
      roomCode,
      status: "ACTIVE",
      activeOnly: true,
    });

    return Response.json({ data: containers });
  });
}
