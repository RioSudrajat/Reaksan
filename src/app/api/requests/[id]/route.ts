import { ApiError, readJson, withApiSession } from "@/lib/api";
import {
  cancelRequest,
  getMyRequest,
  updateRequest,
} from "@/services/requests.service";
import {
  createRequestSchema,
  requestIdSchema,
} from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const found = await getMyRequest(session.user.id, id);
    if (!found) throw new ApiError(404, "NOT_FOUND", "Request not found.");
    return Response.json({ data: found });
  });
}

export function PATCH(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const input = createRequestSchema.parse(await readJson(request));
    return Response.json({ data: await updateRequest(session.user.id, id, input) });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    return Response.json({ data: await cancelRequest(session.user.id, id) });
  });
}
