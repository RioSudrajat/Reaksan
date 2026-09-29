import { withApiPermission } from "@/lib/api";
import { listPlpHistory } from "@/services/plp.service";
import { historyQuerySchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { audit: ["read-any"] }, async () => {
    const query = historyQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listPlpHistory(query));
  });
}
