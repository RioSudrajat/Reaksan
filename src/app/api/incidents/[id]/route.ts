import { ApiError, withApiSession } from "@/lib/api";
import { getMyIncident } from "@/services/incidents.service";
import { incidentCodeSchema } from "@/validators/incidents";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const code = incidentCodeSchema.parse((await context.params).id);
    const found = await getMyIncident(session.user.id, code);
    if (!found) throw new ApiError(404, "NOT_FOUND", "Incident not found.");
    return Response.json({ data: found });
  });
}
