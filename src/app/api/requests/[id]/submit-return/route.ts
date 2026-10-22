import { readJson, withApiSession } from "@/lib/api";
import { submitStudentReturn } from "@/services/requests.service";
import { requestIdSchema, studentReturnSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const input = studentReturnSchema.parse(await readJson(request));
    return Response.json({
      data: await submitStudentReturn(session.user.id, id, input),
    });
  });
}
