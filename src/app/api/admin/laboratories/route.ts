import { readJson, withApiPermission } from "@/lib/api";
import {
  createLaboratory,
  listLaboratories,
} from "@/services/admin.service";
import { laboratoryInputSchema } from "@/validators/admin";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { labs: ["manage-any"] }, async () =>
    Response.json({ data: await listLaboratories() }),
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { labs: ["manage-any"] },
    async (session) => {
      const input = laboratoryInputSchema.parse(await readJson(request));
      return Response.json(
        { data: await createLaboratory(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
