import { readJson, withApiPermission } from "@/lib/api";
import { createAssignment, listAssignments } from "@/services/admin.service";
import { assignmentInputSchema } from "@/validators/admin";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { assignments: ["manage-any"] }, async () =>
    Response.json({ data: await listAssignments() }),
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { assignments: ["manage-any"] },
    async (session) => {
      const input = assignmentInputSchema.parse(await readJson(request));
      return Response.json(
        { data: await createAssignment(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
