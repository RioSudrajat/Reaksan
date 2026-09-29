import { withApiSession } from "@/lib/api";
import { cancelSharedUsage } from "@/services/shared-usage.service";
import { sharedUsageIdSchema } from "@/validators/shared-usage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = sharedUsageIdSchema.parse((await context.params).id);
    return Response.json({
      data: await cancelSharedUsage(session.user.id, id),
    });
  });
}
