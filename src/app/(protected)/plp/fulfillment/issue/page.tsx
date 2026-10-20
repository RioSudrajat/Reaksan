import type { Metadata } from "next";
import { IssueQueue } from "@/components/plp/issue-queue";
import { PageHeader, Pagination, Panel } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import { getRoomScope, scopeRoomCodes } from "@/services/access-scope.service";
import { listRequestPage } from "@/services/requests.service";

export const metadata: Metadata = { title: "Issue" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

export default async function PlpIssuePage({
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
    statuses: ["APPROVED", "READY_FOR_PICKUP"],
    roomCodes: scopeRoomCodes(scope),
    limit,
    offset: (page - 1) * limit,
  });
  const totalPages = requestPage.meta.totalPages;

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment"
        title="Issue resource"
        description="Siapkan resource, verifikasi mahasiswa, lalu serahkan. Material berkurang tepat sekali saat issue."
      />
      <Panel
        context={`${requestPage.meta.total} request`}
        title="Antrian issue"
        padded={false}
      >
        <div className="p-4 sm:p-5">
          <IssueQueue requests={requestPage.data} />
        </div>
      </Panel>

      <Pagination
        basePath="/plp/fulfillment/issue"
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
