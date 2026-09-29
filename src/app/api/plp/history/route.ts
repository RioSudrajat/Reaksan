import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { listPlpHistory } from "@/services/plp.service";
import { historyQuerySchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { history: ["read-any"] },
    async (session) => {
      const query = historyQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const { roomCodes } = await scopeForSession(session);
      return Response.json(await listPlpHistory({ ...query, roomCodes }));
    },
  );
}
