import type { Metadata } from "next";
import Link from "next/link";
import { PlpScheduleSection } from "@/components/plp/schedule-calendar";
import { ScheduleToolbar } from "@/components/plp/schedule-toolbar";
import { DailyRunSheet } from "@/components/plp/daily-run-sheet";
import { PageHeader } from "@/components/workspace";
import { currentScheduleMonth } from "@/components/schedule-data";
import { listRoomViews } from "@/services/catalog.service";
import { loadScheduleCalendar, listPlpSchedule } from "@/services/plp.service";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { scheduleViewSchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Schedule" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const item = Array.isArray(value) ? value[0] : value;
  return item && item.trim() !== "" ? item.trim() : undefined;
}

export default async function PlpSchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const view = pick(params, "view") === "runsheet" ? "runsheet" : "calendar";
  const date =
    pick(params, "date") ||
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date());

  const query = scheduleViewSchema.parse({
    room: pick(params, "room"),
    kind: pick(params, "kind") ?? "all",
  });
  const month = currentScheduleMonth();

  const [allRooms, calendarEvents, runSheetEvents] = await Promise.all([
    listRoomViews(),
    view === "calendar"
      ? loadScheduleCalendar({
          month,
          room: query.room,
          roomCodes,
          kind: query.kind,
          viewerId: user.id,
        })
      : Promise.resolve([]),
    view === "runsheet"
      ? listPlpSchedule({
          from: date,
          to: date,
          room: query.room,
          roomCodes,
          kind: query.kind,
        })
      : Promise.resolve([]),
  ]);

  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((room) => roomCodes.includes(room.id));

  const currentRoomName = rooms.find((r) => r.id === query.room)?.name;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Operasional"
          title="Jadwal & Agenda Lab"
          description="Pantau penggunaan ruang laboratorium, agenda penelitian mahasiswa, dan persiapan alat-bahan operasional."
          actions={
            <div className="flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-1 text-[12px] font-semibold">
              <Link
                href={`/plp/schedule?view=calendar${query.room ? `&room=${query.room}` : ""}`}
                className={
                  "rounded-lg px-3 py-1.5 transition " +
                  (view === "calendar"
                    ? "bg-white text-[#121826] font-bold shadow-xs border border-[#E5E7EB]"
                    : "text-[#64748B] hover:text-[#121826] hover:bg-white/60")
                }
              >
                Kalender Bulanan
              </Link>
              <Link
                href={`/plp/schedule?view=runsheet&date=${date}${query.room ? `&room=${query.room}` : ""}`}
                className={
                  "rounded-lg px-3 py-1.5 transition " +
                  (view === "runsheet"
                    ? "bg-white text-[#121826] font-bold shadow-xs border border-[#E5E7EB]"
                    : "text-[#64748B] hover:text-[#121826] hover:bg-white/60")
                }
              >
                Daily Run Sheet
              </Link>
            </div>
          }
        />
      </div>

      {view === "runsheet" ? (
        <DailyRunSheet
          events={runSheetEvents}
          currentDate={date}
          rooms={rooms}
          currentRoom={query.room}
        />
      ) : (
        <PlpScheduleSection
          events={calendarEvents}
          initialMonth={month}
          toolbar={
            <ScheduleToolbar
              rooms={rooms}
              currentRoom={query.room}
              currentKind={query.kind}
              basePath="/plp/schedule"
            />
          }
          currentRoomCode={query.room}
          currentRoomName={currentRoomName}
        />
      )}
    </>
  );
}
