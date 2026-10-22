import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { room } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { getRoomScope, scopeRoomCodes } from "@/services/access-scope.service";
import {
  getWasteSummary,
  listWasteCategories,
  listWasteContainers,
  listWasteLogs,
  listWasteManifests,
} from "@/services/waste.service";
import {
  WasteManagementClient,
  type WasteContainerItem,
  type WasteCategoryItem,
  type WasteLogItem,
  type WasteSummaryData,
  type WasteManifestItem,
} from "@/components/plp/waste-management-client";

export const metadata: Metadata = {
  title: "Pengelolaan Limbah Laboratorium - PLP",
  description: "Monitoring kuota jerigen limbah dan pencatatan sisa praktikum B3.",
};

export default async function PlpWastePage() {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);

  // Query rooms within scope
  const roomsQuery = db
    .select({ id: room.id, code: room.code, name: room.name })
    .from(room);

  const rooms =
    roomCodes === null
      ? await roomsQuery.orderBy(room.name)
      : roomCodes.length === 0
        ? []
        : await roomsQuery.where(inArray(room.code, roomCodes)).orderBy(room.name);

  // Query categories & containers
  const categories = await listWasteCategories();
  const containers = await listWasteContainers(roomCodes, { activeOnly: true });
  const manifests = await listWasteManifests();

  // Query initial monthly logs
  const logsResult = await listWasteLogs(roomCodes, { period: "monthly" });
  const summary = await getWasteSummary(roomCodes, { period: "monthly" });

  return (
    <div className="space-y-6">
      <WasteManagementClient
        initialContainers={containers as unknown as WasteContainerItem[]}
        initialCategories={categories as unknown as WasteCategoryItem[]}
        initialLogs={logsResult.logs as unknown as WasteLogItem[]}
        initialSummary={summary as unknown as WasteSummaryData}
        initialManifests={manifests as unknown as WasteManifestItem[]}
        rooms={rooms}
      />
    </div>
  );
}
