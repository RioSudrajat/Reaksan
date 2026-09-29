import type { Metadata } from "next";
import { ReturnQueue } from "@/components/plp/return-queue";
import { PageHeader, Panel } from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { listRequestPage } from "@/services/requests.service";

export const metadata: Metadata = { title: "Return & Inspeksi" };

export default async function PlpReturnPage() {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const page = await listRequestPage({
    statuses: ["ACTIVE", "RETURNED", "OVERDUE"],
    roomCodes: scopeRoomCodes(scope),
    limit: 50,
    offset: 0,
  });
  return (
    <>
      <PageHeader
        eyebrow="Fulfillment"
        title="Return dan inspeksi"
        description="Catat pengembalian equipment borrowable, tentukan hasil inspeksi, dan selesaikan usage-only."
      />
      <Panel
        context={`${page.meta.total} request`}
        title="Antrian return"
        padded={false}
      >
        <div className="p-4 sm:p-5">
          <ReturnQueue requests={page.data} />
        </div>
      </Panel>
    </>
  );
}
