import { withApiPermission } from "@/lib/api";
import { batchVerifyWasteLogs } from "@/services/waste.service";
import { batchVerifyWasteLogSchema } from "@/validators/waste";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const body = await request.json();
      const input = batchVerifyWasteLogSchema.parse(body);
      const results = await batchVerifyWasteLogs(input, session.user.id);
      return Response.json({ data: results });
    },
  );
}
