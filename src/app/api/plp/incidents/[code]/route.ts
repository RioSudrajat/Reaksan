import { ApiError, withApiPermission } from "@/lib/api";
import { assertIncidentInScope, scopeForSession } from "@/services/access-scope.service";
import { getAnyIncident } from "@/services/incidents.service";
import { incidentCodeSchema } from "@/validators/incidents";

export const runtime = "nodejs";
type Context = { params: Promise<{ code: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(
    request,
    { incidents: ["read-any"] },
    async (session) => {
      const code = incidentCodeSchema.parse((await context.params).code);
      const { scope } = await scopeForSession(session);
      const found = await getAnyIncident(code);
      if (!found) throw new ApiError(404, "NOT_FOUND", "Incident not found.");
      await assertIncidentInScope(scope, code);
      return Response.json({ data: found });
    },
  );
}
