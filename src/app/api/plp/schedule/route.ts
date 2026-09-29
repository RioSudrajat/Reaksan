import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { listPlpSchedule } from "@/services/plp.service";
import { scheduleQuerySchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { schedule: ["read-any"] },
    async (session) => {
      const query = scheduleQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const { roomCodes } = await scopeForSession(session);
      return Response.json({
        data: await listPlpSchedule({ ...query, roomCodes }),
      });
    },
  );
}
