import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { getPlpDashboard } from "@/services/plp.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { plp: ["view"] }, async (session) => {
    const { roomCodes } = await scopeForSession(session);
    return Response.json({
      data: await getPlpDashboard(session.user.id, roomCodes),
    });
  });
}
