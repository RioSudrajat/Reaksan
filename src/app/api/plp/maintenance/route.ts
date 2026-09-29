import { withApiPermission } from "@/lib/api";
import { runRequestMaintenance } from "@/services/requests.service";

export const runtime = "nodejs";

// Lazy automation: marks overdue requests and sends reservation reminders when
// PLP opens the workspace, since the app has no external scheduler yet.
export function POST(request: Request) {
  return withApiPermission(request, { plp: ["view"] }, async (session) =>
    Response.json({
      data: await runRequestMaintenance(session.user.id),
    }),
  );
}
