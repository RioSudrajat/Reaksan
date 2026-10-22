import { readJson, withApiSession } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
import { recordWasteDisposal } from "@/services/waste.service";
import { logWasteDisposalSchema } from "@/validators/waste";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    assertRateLimit(request, {
      namespace: "waste:disposal",
      limit: 30,
      windowMs: 60_000,
      identifier: session.user.id,
    });

    const body = await readJson(request);
    const input = logWasteDisposalSchema.parse(body);

    const log = await recordWasteDisposal(input, session.user.id);
    return Response.json({ data: log }, { status: 201 });
  });
}
