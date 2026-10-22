import { withApiPermission } from "@/lib/api";
import {
  handoverContainersToManifest,
  listWasteManifests,
} from "@/services/waste.service";
import { createWasteManifestSchema } from "@/validators/waste";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { waste: ["read-any"] },
    async () => {
      const manifests = await listWasteManifests();
      return Response.json({ data: manifests });
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { waste: ["manage-any"] },
    async (session) => {
      const body = await request.json();
      const input = createWasteManifestSchema.parse(body);
      const manifest = await handoverContainersToManifest(input, session.user.id);
      return Response.json({ data: manifest });
    },
  );
}
