import { withApiPermission } from "@/lib/api";
import { sealAndRolloverContainer } from "@/services/waste.service";
import { sealAndRolloverSchema } from "@/validators/waste";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export function POST(request: Request, context: RouteContext) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const input = sealAndRolloverSchema.parse(body);
      const result = await sealAndRolloverContainer(id, input, session.user.id);
      return Response.json({ data: result });
    },
  );
}
