import { withApiPermission } from "@/lib/api";
import { cleanupOrphanMedia } from "@/services/media.service";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { configuration: ["manage-any"] },
    async (session) => {
      const removed = await cleanupOrphanMedia(session.user.id);
      return Response.json({ removed });
    },
  );
}
