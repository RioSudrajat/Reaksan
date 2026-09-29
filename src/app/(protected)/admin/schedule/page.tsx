import type { Metadata } from "next";
import { PlpScheduleCalendar } from "@/components/plp/schedule-calendar";
import { ScheduleToolbar } from "@/components/plp/schedule-toolbar";
import { PageHeader } from "@/components/workspace";
import { currentScheduleMonth } from "@/components/schedule-data";
import { listRoomViews } from "@/services/catalog.service";
import { loadScheduleCalendar } from "@/services/plp.service";
import { requirePermission } from "@/lib/session";
import { scheduleViewSchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Schedule" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const item = Array.isArray(value) ? value[0] : value;
  return item && item.trim() !== "" ? item.trim() : undefined;
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ schedule: ["read-any"] });
  const params = await searchParams;
  const query = scheduleViewSchema.parse({
    room: pick(params, "room"),
    kind: pick(params, "kind") ?? "all",
  });
  const month = currentScheduleMonth();
  const [events, rooms] = await Promise.all([
    loadScheduleCalendar({
      month,
      room: query.room,
      kind: query.kind,
      viewerId: user.id,
    }),
    listRoomViews(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Global schedule"
        description="Kalender operasional yang sama dengan PLP workspace. Admin tidak mengubah jadwal di sini; gunakan request detail atau audit untuk menelusuri perubahan."
      />
      <PlpScheduleCalendar
        events={events}
        month={month}
        toolbar={
          <ScheduleToolbar
            rooms={rooms}
            currentRoom={query.room}
            currentKind={query.kind}
            basePath="/admin/schedule"
          />
        }
      />
    </>
  );
}
