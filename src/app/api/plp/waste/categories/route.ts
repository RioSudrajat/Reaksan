import { withApiPermission } from "@/lib/api";
import { listWasteCategories } from "@/services/waste.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { waste: ["read-any"] },
    async () => {
      const categories = await listWasteCategories();
      return Response.json({ data: categories });
    },
  );
}
