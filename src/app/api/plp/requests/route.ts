import { withApiPermission } from "@/lib/api";
import { scopeForSession } from "@/services/access-scope.service";
import { listRequestPage } from "@/services/requests.service";
import { listPlpRequestsSchema } from "@/validators/plp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { requests: ["read-any"] },
    async (session) => {
      const query = listPlpRequestsSchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const from = query.from
        ? new Date(`${query.from}T00:00:00+07:00`)
        : undefined;
      const to = query.to
        ? new Date(`${query.to}T23:59:59.999+07:00`)
        : undefined;
      const { roomCodes } = await scopeForSession(session);
      const page = await listRequestPage({
        statuses: query.status ? [query.status] : undefined,
        roomCode: query.room,
        roomCodes,
        from,
        to,
        orderBy: "statusPriority",
        limit: query.limit,
        offset: query.offset,
        search: query.student ?? query.activity,
      });
      return Response.json(page);
    },
  );
}
