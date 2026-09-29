import { readJson, withApiSession } from "@/lib/api";
import {
  createSharedUsageRequest,
  loadSharedUsagePage,
} from "@/services/shared-usage.service";
import { createSharedUsageSchema } from "@/validators/shared-usage";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await loadSharedUsagePage(session.user.id) }),
  );
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = createSharedUsageSchema.parse(await readJson(request));
    const created = await createSharedUsageRequest(session.user.id, input);
    return Response.json({ data: created }, { status: 201 });
  });
}
