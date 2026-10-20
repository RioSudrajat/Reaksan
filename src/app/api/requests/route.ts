import { readJson, withApiSession } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
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
    assertRateLimit(request, {
      namespace: "requests:post",
      limit: 30,
      windowMs: 60_000,
      identifier: session.user.id,
    });
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
