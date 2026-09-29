import { readJson, withApiSession } from "@/lib/api";
import { createIncident, listMyIncidents } from "@/services/incidents.service";
import { createIncidentSchema } from "@/validators/incidents";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await listMyIncidents(session.user.id) }),
  );
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = createIncidentSchema.parse(await readJson(request));
    const created = await createIncident(session.user.id, input);
    return Response.json(
      { data: created },
      { status: 201, headers: { Location: `/api/incidents/${created.code}` } },
    );
  });
}
