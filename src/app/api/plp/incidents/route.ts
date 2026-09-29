import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { createIncident, listIncidentPage } from "@/services/incidents.service";
import { createIncidentSchema } from "@/validators/incidents";
import { listPlpIncidentsSchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { incidents: ["read-any"] },
    async (session) => {
      const query = listPlpIncidentsSchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const { roomCodes } = await scopeForSession(session);
      const page = await listIncidentPage({
        statuses: query.status ? [query.status] : undefined,
        severities: query.severity ? [query.severity] : undefined,
        roomCode: query.room,
        roomCodes,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      });
      return Response.json(page);
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { plp: ["view"] },
    async (session) => {
      const input = createIncidentSchema.parse(await readJson(request));
      const { roomCodes } = await scopeForSession(session);
      const created = await createIncident(session.user.id, input, {
        allowStaffScope: true,
        roomCodes,
      });
      return Response.json(
        { data: created },
        { status: 201, headers: { Location: `/api/plp/incidents/${created.code}` } },
      );
    },
  );
}

