import type { Metadata } from "next";
import { ReturnQueue } from "@/components/plp/return-queue";
import { PageHeader, Pagination, Panel } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getRoomScope, scopeRoomCodes } from "@/services/access-scope.service";
import { listRequestPage } from "@/services/requests.service";

export const metadata: Metadata = { title: "Return & Inspeksi" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function PlpReturnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const requestPage = await listRequestPage({
    statuses: ["ACTIVE", "RETURNED", "OVERDUE"],
    roomCodes: scopeRoomCodes(scope),
    limit,
    offset: (page - 1) * limit,
  });
  const totalPages = requestPage.meta.totalPages;

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment"
        title="Return dan inspeksi"
        description="Catat pengembalian equipment borrowable, tentukan hasil inspeksi, dan selesaikan usage-only."
      />
      <Panel
        context={`${requestPage.meta.total} request`}
        title="Antrian return"
        padded={false}
      >
        <div className="p-4 sm:p-5">
          <ReturnQueue requests={requestPage.data} />
        </div>
      </Panel>

      <Pagination
        basePath="/plp/fulfillment/return"
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
