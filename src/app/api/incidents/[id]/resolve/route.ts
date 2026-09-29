import { readJson, withApiPermission } from "@/lib/api";
import {
  assertIncidentInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import { resolveIncident } from "@/services/incidents.service";
import {
  incidentCodeSchema,
  resolveIncidentSchema,
} from "@/validators/incidents";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { incidents: ["resolve-any"] },
    async (session) => {
      const code = incidentCodeSchema.parse((await context.params).id);
      const input = resolveIncidentSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      await assertIncidentInScope(scope, code);
      return Response.json({
        data: await resolveIncident(session.user.id, code, input),
      });
    },
  );
}
