import { readJson, withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { createPlpEquipmentUnit } from "@/services/plp.service";
import { entityCodeSchema } from "@/validators/catalog";
import { plpEquipmentUnitInputSchema } from "@/validators/plp";

export const runtime = "nodejs";
type Context = { params: Promise<{ code: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const code = entityCodeSchema.parse((await context.params).code);
      const input = plpEquipmentUnitInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      const created = await createPlpEquipmentUnit(
        session.user.id,
        scope,
        code,
        input,
      );
      return Response.json({ data: created }, { status: 201 });
    },
  );
}
