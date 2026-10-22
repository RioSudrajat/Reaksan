import { withApiPermission } from "@/lib/api";
import { moveContainersToTps } from "@/services/waste.service";
import { moveToTpsSchema } from "@/validators/waste";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const body = await request.json();
      const input = moveToTpsSchema.parse(body);
      const updated = await moveContainersToTps(input, session.user.id);
      return Response.json({ data: updated });
    },
  );
}
