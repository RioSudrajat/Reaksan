import type { Metadata } from "next";
import { IssueQueue } from "@/components/plp/issue-queue";
import { PageHeader, Panel } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { listRequestPage } from "@/services/requests.service";

export const metadata: Metadata = { title: "Issue" };

export default async function PlpIssuePage() {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const page = await listRequestPage({
    statuses: ["APPROVED", "READY_FOR_PICKUP"],
    roomCodes: scopeRoomCodes(scope),
    limit: 50,
    offset: 0,
  });
  return (
    <>
      <PageHeader
        eyebrow="Fulfillment"
        title="Issue resource"
        description="Siapkan resource, verifikasi mahasiswa, lalu serahkan. Material berkurang tepat sekali saat issue."
      />
      <Panel
        context={`${page.meta.total} request`}
        title="Antrian issue"
        padded={false}
      >
        <div className="p-4 sm:p-5">
          <IssueQueue requests={page.data} />
        </div>
      </Panel>
    </>
  );
}
