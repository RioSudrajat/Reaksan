import { readJson, withApiPermission } from "@/lib/api";
import {
  createMaterialBatch,
  listBatchesAdmin,
} from "@/services/admin.service";
import { materialBatchInputSchema } from "@/validators/admin";
import { z } from "zod";

export const runtime = "nodejs";

const materialQuerySchema = z
  .object({ material: z.string().trim().max(64).optional() })
  .strict();

export function GET(request: Request) {
  return withApiPermission(request, { materials: ["manage-any"] }, async () => {
    const query = materialQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json({ data: await listBatchesAdmin(query.material) });
  });
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { materials: ["manage-any"] },
    async (session) => {
      const input = materialBatchInputSchema.parse(await readJson(request));
      return Response.json(
        { data: await createMaterialBatch(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
