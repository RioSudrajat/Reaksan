import type { Metadata } from "next";
import Link from "next/link";
import { OpnameStartForm } from "@/components/plp/opname-start-form";
import { StatusBadge } from "@/components/status-badge";
import {
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Panel,
  controlClass,
  formatDateTime,
} from "@/components/workspace";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { listRoomViews } from "@/services/catalog.service";
import { listOpnameSessions } from "@/services/opname.service";
import { opnameListQuerySchema } from "@/validators/opname";

export const metadata: Metadata = { title: "Stok Opname" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const statusLabel: Record<string, string> = {
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusTone: Record<string, "blue" | "green" | "cream"> = {
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "cream",
};

export default async function OpnameSessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ inventory: ["manage-any"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const query = opnameListQuerySchema.parse({
    room: pick(params, "room"),
    status: pick(params, "status"),
    page,
  });
  const [result, allRooms] = await Promise.all([
    listOpnameSessions({
      roomCode: query.room,
      roomCodes,
      status: query.status,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }),
    listRoomViews(),
  ]);
  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((room) => roomCodes.includes(room.id));
  const activeFilterCount = [query.room, query.status].filter(Boolean).length;
  const totalPages = result.meta.totalPages;

  return (
    <>
      <PageHeader
        eyebrow="Inventori"
        title="Stok opname"
        description="Hitung jumlah fisik per room dan bandingkan dengan catatan sistem. Sesi hitung tidak mengubah stok; koreksi tetap lewat penyesuaian batch manual."
      />

      <Panel context="Sesi baru" title="Mulai sesi hitung" className="mb-5">
        <OpnameStartForm
          rooms={rooms.map((room) => ({ code: room.id, name: room.name }))}
        />
      </Panel>

      <FilterBar
        action="/plp/inventory/opname"
        activeCount={activeFilterCount}
        clearHref="/plp/inventory/opname"
      >
        <FilterField label="Room" className="w-full sm:w-56">
          <select
            name="room"
            defaultValue={query.room ?? ""}
            className={controlClass}
          >
            <option value="">Semua room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status" className="w-full sm:w-48">
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className={controlClass}
          >
            <option value="">Semua status</option>
            <option value="IN_PROGRESS">Berjalan</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada sesi hitung"
              description="Mulai sesi pertama lewat form di atas untuk mengunci baseline satu room."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {result.data.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/plp/inventory/opname/${session.id}`}
                  className="flex flex-col gap-3 p-4 transition hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#212121]">
                        {session.roomName}
                      </span>
                      <StatusBadge tone={statusTone[session.status] ?? "cream"}>
                        {statusLabel[session.status] ?? session.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#6B6B6B]">
                      {session.roomCode} · dimulai {session.startedByName} ·{" "}
                      {formatDateTime(session.startedAt)} · {session.entryCount}{" "}
                      batch
                    </p>
                    {session.notes && (
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#929292]">
                    {session.completedAt
                      ? `Selesai ${formatDateTime(session.completedAt)}`
                      : "Lihat detail"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Pagination
        basePath="/plp/inventory/opname"
        query={{ room: query.room, status: query.status }}
        page={query.page}
        totalPages={totalPages}
      />
    </>
  );
}
