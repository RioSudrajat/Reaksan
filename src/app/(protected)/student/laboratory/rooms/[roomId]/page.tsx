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
  findRoomByCode,
} from "@/services/catalog.service";
import {
  listRoomApprovedRequests,
  listRoomReservations,
} from "@/services/requests.service";
import { listRoomConfirmedSharedUsage } from "@/services/shared-usage.service";
import { buildCalendarEvents, scheduleMonths } from "@/services/view.service";

type Params = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { roomId } = await params;
  const room = await findRoomByCode(db, roomId);
  return { title: room?.name ?? "Room" };
}

export default async function StudentRoomPage({ params }: Params) {
  const { roomId } = await params;
  const { user } = await requireSession();
  const room = await findRoomByCode(db, roomId);
  if (!room) notFound();
  const [rooms, equipment, materials, requests, reservations, shared] =
    await Promise.all([
      buildRoomViews(db),
      buildEquipmentViews(db, { roomCode: roomId }),
      buildMaterialViews(db, { roomCode: roomId }),
      listRoomApprovedRequests(roomId),
      listRoomReservations(roomId, user.id),
      listRoomConfirmedSharedUsage(roomId, user.id),
    ]);
  const month = currentScheduleMonth();
  const events = buildCalendarEvents({
    requests,
    reservations,
    shared,
    month,
    months: scheduleMonths(month),
    viewerId: user.id,
  });
  return (
    <ReaksanFlowPage
      kind="room-detail"
      id={roomId}
      userName={user.name}
      catalog={{ rooms, equipment, materials }}
      events={events}
      month={month}
    />
  );
}
