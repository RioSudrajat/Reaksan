import { readJson, withApiPermission } from "@/lib/api";
import {
  assertIncidentInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { assessIncident } from "@/services/incidents.service";
import {
  assessIncidentSchema,
  incidentCodeSchema,
} from "@/validators/incidents";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { incidents: ["assess-any"] },
    async (session) => {
      const code = incidentCodeSchema.parse((await context.params).id);
      const input = assessIncidentSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertIncidentInScope(scope, code);
      return Response.json({
        data: await assessIncident(session.user.id, code, input),
      });
    },
  );
}
