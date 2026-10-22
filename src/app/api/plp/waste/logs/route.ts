import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { getWasteSummary, listWasteLogs } from "@/services/waste.service";
import { wasteExportQuerySchema } from "@/validators/waste";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { waste: ["read-any"] },
    async (session) => {
      const { roomCodes } = await scopeForSession(session);
      const url = new URL(request.url);
      const query = wasteExportQuerySchema.parse(
        Object.fromEntries(url.searchParams),
      );

      const logsResult = await listWasteLogs(roomCodes, query);
      const summary = await getWasteSummary(roomCodes, query);

      return Response.json({
        data: logsResult.logs,
        summary,
        periodLabel: logsResult.label,
        from: logsResult.from,
        to: logsResult.to,
      });
    },
  );
}
