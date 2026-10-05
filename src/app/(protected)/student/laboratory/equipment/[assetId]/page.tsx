import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ReaksanFlowPage } from "@/components/reaksan-flow-pages";
import { currentScheduleMonth } from "@/components/schedule-data";
import { requireSession } from "@/lib/session";
import {
  buildEquipmentViews,
  buildMaterialViews,
  buildRoomViews,
} from "@/services/catalog.service";

type Params = { params: Promise<{ assetId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { assetId } = await params;
  return { title: `Instrumen ${assetId} · Reaksan` };
}

export default async function StudentEquipmentDetailPage({
  params,
}: Params) {
  const { assetId } = await params;
  const { user } = await requireSession();
  const [rooms, equipment, materials] = await Promise.all([
    buildRoomViews(db),
    buildEquipmentViews(db),
    buildMaterialViews(db),
  ]);
  const exists = equipment.some(
    (asset) => asset.id.toLowerCase() === assetId.toLowerCase(),
  );
  if (!exists) notFound();
  return (
    <ReaksanFlowPage
      kind="equipment-detail"
      id={assetId}
      userName={user.name}
      catalog={{ rooms, equipment, materials }}
      month={currentScheduleMonth()}
    />
  );
}
