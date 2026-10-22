import { readJson, withApiPermission } from "@/lib/api";
import { verifyWasteLog } from "@/services/waste.service";
import { verifyWasteLogSchema } from "@/validators/waste";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export function POST(request: Request, context: RouteContext) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const { id } = await context.params;
      const body = await readJson(request);
      const input = verifyWasteLogSchema.parse(body);

      const verified = await verifyWasteLog(id, input, session.user.id);
      return Response.json({ data: verified });
    },
  );
}
