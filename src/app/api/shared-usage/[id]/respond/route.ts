import { readJson, withApiSession } from "@/lib/api";
import { respondSharedUsage } from "@/services/shared-usage.service";
import {
  respondSharedUsageSchema,
  sharedUsageIdSchema,
} from "@/validators/shared-usage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = sharedUsageIdSchema.parse((await context.params).id);
    const input = respondSharedUsageSchema.parse(await readJson(request));
    return Response.json({
      data: await respondSharedUsage(session.user.id, id, input.action),
    });
  });
}
