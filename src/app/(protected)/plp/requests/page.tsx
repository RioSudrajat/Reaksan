import type { Metadata } from "next";
import Link from "next/link";
import {
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Panel,
  RequestStatusBadge,
  controlClass,
  formatRange,
} from "@/components/workspace";
import { listRoomViews } from "@/services/catalog.service";
import { listRequestPage } from "@/services/requests.service";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { listPlpRequestsSchema, requestStatusValues } from "@/validators/plp";

export const metadata: Metadata = { title: "Request Review" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlpRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const limit = 25;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const query = listPlpRequestsSchema.parse({
    status: pick(params, "status"),
    room: pick(params, "room"),
    student: pick(params, "student"),
    activity: pick(params, "activity"),
    from: pick(params, "from"),
    to: pick(params, "to"),
    limit,
    offset: (page - 1) * limit,
  });
  const [result, allRooms] = await Promise.all([
    listRequestPage({
      statuses: query.status ? [query.status] : undefined,
      roomCode: query.room,
      roomCodes,
      search: query.student || query.activity,
      from: query.from ? new Date(`${query.from}T00:00:00+07:00`) : undefined,
      to: query.to ? new Date(`${query.to}T23:59:59.999+07:00`) : undefined,
      limit: query.limit,
      offset: query.offset,
    }),
    listRoomViews(),
  ]);
  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((room) => roomCodes.includes(room.id));
  const activeFilterCount = ["status", "room", "student", "activity", "from", "to"].filter(
    (key) => Boolean(pick(params, key)),
  ).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment loop"
        title="Request review"
        description="Tinjau permintaan mahasiswa, cek konflik jadwal dan stok, lalu setujui, minta revisi, atau tolak."
      />

      <FilterBar
        action="/plp/requests"
        activeCount={activeFilterCount}
        clearHref="/plp/requests"
      >
        <FilterField label="Status" className="w-full sm:w-40">
          <select name="status" defaultValue={query.status ?? ""} className={controlClass}>
            <option value="">Semua status</option>
            {requestStatusValues.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Room" className="w-full sm:w-44">
          <select name="room" defaultValue={query.room ?? ""} className={controlClass}>
            <option value="">Semua room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Mahasiswa / activity" className="w-full sm:w-56">
          <input
            type="search"
            name="student"
            defaultValue={query.student ?? ""}
            placeholder="Nama atau judul activity"
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Dari" className="w-full sm:w-40">
          <input type="date" name="from" defaultValue={query.from ?? ""} className={controlClass} />
        </FilterField>
        <FilterField label="Sampai" className="w-full sm:w-40">
          <input type="date" name="to" defaultValue={query.to ?? ""} className={controlClass} />
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada request yang cocok"
              description="Ubah filter atau tunggu request baru dari mahasiswa."
              action={
                <Link
                  href="/plp/requests"
                  className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Hapus filter
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#EEEEEE] md:hidden">
              {result.data.map((request) => (
                <li key={request.id} className="p-4">
                  <Link href={`/plp/requests/${request.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#212121]">
                          {request.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#929292]">
                          {request.code}
                        </p>
                      </div>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <dt className="text-[#929292]">Mahasiswa</dt>
                        <dd className="font-medium text-[#212121]">
                          {request.actorName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#929292]">Room</dt>
                        <dd className="font-medium text-[#212121]">
                          {request.roomName}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[#929292]">Jadwal</dt>
                        <dd className="font-medium text-[#212121] [font-variant-numeric:tabular-nums]">
                          {formatRange(request.startAt, request.endAt)}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Daftar request menunggu dan sudah direview
                </caption>
                <thead>
                  <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                    <th scope="col" className="px-4 py-3 font-semibold">Request</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Mahasiswa</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Room</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Jadwal</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Resource</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-[#F1F0EC] align-top last:border-0"
                    >
                      <th scope="row" className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[#212121]">
                          {request.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#929292]">
                          {request.code} · {request.activityTitle}
                        </p>
                      </th>
                      <td className="px-4 py-3 text-[12px] text-[#212121]">
                        {request.actorName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121]">
                        {request.roomName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                        {formatRange(request.startAt, request.endAt)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                        {request.equipment.length} equipment ·{" "}
                        {request.materials.length} material
                      </td>
                      <td className="px-4 py-3">
                        <RequestStatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/plp/requests/${request.id}`}
                          className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Pagination
        basePath="/plp/requests"
        query={{
          status: query.status,
          room: query.room,
          student: query.student,
          activity: query.activity,
          from: query.from,
          to: query.to,
        }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
