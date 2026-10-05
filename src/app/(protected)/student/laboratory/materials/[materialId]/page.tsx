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

type Params = {
  params: Promise<{ materialId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { materialId } = await params;
  return { title: `Bahan Kimia ${materialId} · Reaksan` };
}

export default async function StudentMaterialDetailPage({
  params,
  searchParams,
}: Params) {
  const { materialId } = await params;
  const query = await searchParams;
  const roomId = typeof query.room === "string" ? query.room : undefined;
  const { user } = await requireSession();
  const [rooms, equipment, materials] = await Promise.all([
    buildRoomViews(db),
    buildEquipmentViews(db),
    buildMaterialViews(db),
  ]);
  const exists = materials.some(
    (material) =>
      material.id.toLowerCase() === materialId.toLowerCase() &&
      (!roomId || material.roomId === roomId),
  );
  if (!exists) notFound();
  return (
    <ReaksanFlowPage
      kind="material-detail"
      id={materialId}
      roomId={roomId}
      userName={user.name}
      catalog={{ rooms, equipment, materials }}
      month={currentScheduleMonth()}
    />
  );
}
