import { readJson, withApiPermission } from "@/lib/api";
import { getAppSettings, updateAppSettings } from "@/services/settings.service";
import { settingsInputSchema } from "@/validators/admin";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { configuration: ["manage-any"] },
    async () => Response.json({ data: await getAppSettings() }),
  );
}

export function PATCH(request: Request) {
  return withApiPermission(
    request,
    { configuration: ["manage-any"] },
    async (session) => {
      const input = settingsInputSchema.parse(await readJson(request));
      return Response.json({
        data: await updateAppSettings(session.user.id, input),
      });
    },
  );
}
