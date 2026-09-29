import { readJson, withApiPermission } from "@/lib/api";
import {
  assertRoomInScope,
  scopeForSession,
} from "@/services/access-scope.service";
import {
  createOpnameSession,
  listOpnameSessions,
} from "@/services/opname.service";
import {
  opnameListQuerySchema,
  opnameSessionInputSchema,
} from "@/validators/opname";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const query = opnameListQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const { roomCodes } = await scopeForSession(session);
      const result = await listOpnameSessions({
        roomCode: query.room,
        roomCodes,
        status: query.status,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      });
      return Response.json(result);
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { inventory: ["manage-any"] },
    async (session) => {
      const input = opnameSessionInputSchema.parse(await readJson(request));
      const { scope } = await scopeForSession(session);
      assertRoomInScope(scope, input.roomCode);
      return Response.json(
        { data: await createOpnameSession(session.user.id, input) },
        { status: 201 },
      );
    },
  );
}
