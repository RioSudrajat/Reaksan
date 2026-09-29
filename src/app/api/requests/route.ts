import { readJson, withApiSession } from "@/lib/api";
import { createRequest, listMyRequests } from "@/services/requests.service";
import { createRequestSchema } from "@/validators/requests";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await listMyRequests(session.user.id) }),
  );
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = createRequestSchema.parse(await readJson(request));
    const created = await createRequest(session.user.id, input);
    return Response.json(
      { data: created },
      {
        status: 201,
        headers: { Location: `/api/requests/${created.id}` },
      },
    );
  });
}
