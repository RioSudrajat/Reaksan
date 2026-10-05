import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartEmpty,
  ChartPanel,
  HorizontalBarChart,
  StatusBarList,
  type ChartTone,
} from "@/components/charts";
import { CatalogImage } from "@/components/catalog-image";
import {
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Panel,
  controlClass,
} from "@/components/workspace";
import { listRoomViews } from "@/services/catalog.service";
import {
  listPlpEquipment,
  listEquipmentTypesForPlp,
} from "@/services/plp.service";
import { getTopUsage } from "@/services/analytics.service";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import { AddAssetDialog } from "@/components/plp/add-asset-dialog";
import { DeleteConfirmButton } from "@/components/plp/delete-confirm-button";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { inventoryQuerySchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Instrumen Laboratorium" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
}

const equipmentStatusValues = [
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "MAINTENANCE",
  "DAMAGED",
  "UNDER_INSPECTION",
  "RETIRED",
];

const conditionValues = ["GOOD", "MINOR_ISSUE", "DAMAGED", "UNKNOWN"];

const statusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: "Tersedia", tone: "green" },
  RESERVED: { label: "Dipesan", tone: "yellow" },
  IN_USE: { label: "Dipakai", tone: "cream" },
  MAINTENANCE: { label: "Maintenance", tone: "yellow" },
  DAMAGED: { label: "Rusak", tone: "rose" },
  UNDER_INSPECTION: { label: "Menunggu inspeksi", tone: "yellow" },
  RETIRED: { label: "Pensiun", tone: "cream" },
};

const conditionMeta: Record<string, { label: string; tone: BadgeTone }> = {
  GOOD: { label: "Baik", tone: "green" },
  MINOR_ISSUE: { label: "Masalah minor", tone: "yellow" },
  DAMAGED: { label: "Rusak", tone: "rose" },
  UNKNOWN: { label: "Belum diketahui", tone: "cream" },
};

export default async function PlpInstrumentsInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const params = await searchParams;
  const limit = 50;
  const page = Math.max(1, Number(pick(params, "page")) || 1);
  const defaultRoom = roomCodes && roomCodes.length === 1 ? roomCodes[0] : undefined;
  const query = inventoryQuerySchema.parse({
    room: pick(params, "room") || defaultRoom,
    classification: "INSTRUMENT",
    status: pick(params, "status"),
    condition: pick(params, "condition"),
    usage: pick(params, "usage"),
    stock: pick(params, "stock") ?? "all",
    search: pick(params, "search"),
    limit,
    offset: (page - 1) * limit,
  });
  const [result, allRooms, equipmentTypes, topUsage] = await Promise.all([
    listPlpEquipment({
      room: query.room,
      roomCodes,
      classification: "INSTRUMENT",
      status: query.status,
      condition: query.condition,
      usage: query.usage,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    }),
    listRoomViews(),
    listEquipmentTypesForPlp(),
    getTopUsage({ days: 30, roomCode: query.room, roomCodes }),
  ]);
  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((room) => roomCodes.includes(room.id));
  const activeFilterCount = [
    query.room,
    query.status,
    query.condition,
    query.usage,
    query.search,
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));

  const filterHref = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries({
      room: query.room,
      status: query.status,
      condition: query.condition,
      usage: query.usage,
      search: query.search,
      ...overrides,
    })) {
      if (value) p.set(key, value);
    }
    const suffix = p.toString();
    return suffix
      ? `/plp/inventory/instruments?${suffix}`
      : "/plp/inventory/instruments";
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventori"
        title="Instrumen Laboratorium"
        description="Daftar peralatan berdaya listrik, optik, dan elektronik berpresisi tinggi dengan pemantauan kondisi dan kalibrasi."
        actions={
          <AddAssetDialog
            label="+ Tambah Instrumen"
            defaultClassification="INSTRUMENT"
            defaultStorageLocation="Gudang Instrumen"
            rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
            equipmentTypes={equipmentTypes}
          />
        }
      />

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartPanel
          context="Unit Fisik"
          title="Ketersediaan & Status Unit"
          range={`${result.stats.unitStats?.totalUnits ?? 0} total unit instrumen · ${result.stats.unitStats?.availableUnits ?? 0} unit tersedia`}
          footnote="Menghitung ketersediaan unit fisik real-time dari instrumen yang terdaftar."
        >
          {(result.stats.unitStats?.totalUnits ?? 0) === 0 ? (
            <ChartEmpty
              title="Tidak ada instrumen pada filter ini"
              description="Ubah filter untuk melihat sebaran status instrumen."
            />
          ) : (
            <StatusBarList
              rows={[
                {
                  key: "AVAILABLE",
                  label: "Tersedia",
                  value: result.stats.unitStats?.availableUnits ?? 0,
                  tone: "green" as ChartTone,
                  href: filterHref({ status: "AVAILABLE" }),
                },
                {
                  key: "IN_USE",
                  label: "Dipakai",
                  value: result.stats.unitStats?.inUseUnits ?? 0,
                  tone: "dark" as ChartTone,
                  href: filterHref({ status: "IN_USE" }),
                },
                {
                  key: "RESERVED",
                  label: "Dipesan (Booking)",
                  value: result.stats.unitStats?.reservedUnits ?? 0,
                  tone: "yellow" as ChartTone,
                  href: filterHref({ status: "RESERVED" }),
                },
                {
                  key: "MAINTENANCE",
                  label: "Perbaikan / Maintenance",
                  value: result.stats.unitStats?.maintenanceUnits ?? 0,
                  tone: "rose" as ChartTone,
                  href: filterHref({ status: "MAINTENANCE" }),
                },
              ].filter((row) => row.value > 0)}
            />
          )}
        </ChartPanel>

        <ChartPanel
          context="Permohonan (30 Hari)"
          title="Peminjaman Instrumen Terbanyak"
          range={`${topUsage.instruments.reduce((acc, curr) => acc + curr.totalRequests, 0)} permohonan peminjaman instrumen`}
          footnote="Data peminjaman instrumen real-time dari seluruh permohonan aktif / disetujui dalam 30 hari terakhir."
        >
          {topUsage.instruments.length === 0 ? (
            <ChartEmpty
              title="Belum ada aktivitas peminjaman"
              description="Instrumen yang dipinjam melalui permohonan akan otomatis tercatat dan muncul di grafik ini."
            />
          ) : (
            <HorizontalBarChart
              unit="permohonan"
              rows={topUsage.instruments.slice(0, 5).map((item) => ({
                key: item.id,
                label: item.name,
                sublabel: `${item.totalRequests} permohonan · ${item.totalDaysBorrowed} hari peminjaman`,
                value: item.totalRequests,
                tone: "yellow" as const,
              }))}
            />
          )}
        </ChartPanel>
      </div>

      <FilterBar
        action="/plp/inventory/instruments"
        activeCount={activeFilterCount}
        clearHref="/plp/inventory/instruments"
      >
        <FilterField label="Cari" className="w-full sm:w-56">
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Kode atau nama instrumen"
            className={controlClass}
          />
        </FilterField>

        {rooms.length > 1 && (
          <FilterField label="Ruangan">
            <AutoSubmitSelect
              name="room"
              defaultValue={query.room ?? ""}
              className={controlClass}
            >
              <option value="">Semua ruangan</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </FilterField>
        )}

        <FilterField label="Status">
          <AutoSubmitSelect
            name="status"
            defaultValue={query.status ?? ""}
            className={controlClass}
          >
            <option value="">Semua status</option>
            {equipmentStatusValues.map((status) => (
              <option key={status} value={status}>
                {statusMeta[status]?.label ?? status}
              </option>
            ))}
          </AutoSubmitSelect>
        </FilterField>

        <FilterField label="Kondisi">
          <AutoSubmitSelect
            name="condition"
            defaultValue={query.condition ?? ""}
            className={controlClass}
          >
            <option value="">Semua kondisi</option>
            {conditionValues.map((condition) => (
              <option key={condition} value={condition}>
                {conditionMeta[condition]?.label ?? condition}
              </option>
            ))}
          </AutoSubmitSelect>
        </FilterField>

        <FilterField label="Pemakaian">
          <AutoSubmitSelect
            name="usage"
            defaultValue={query.usage ?? ""}
            className={controlClass}
          >
            <option value="">Semua model</option>
            <option value="BORROWABLE">Bisa dipinjam</option>
            <option value="USAGE_ONLY">Dipakai di tempat</option>
          </AutoSubmitSelect>
        </FilterField>
      </FilterBar>

      <Panel
        context={`${result.meta.total} instrumen`}
        title="Daftar"
        padded={false}
      >
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada instrumen yang cocok"
              description="Ubah filter atau hapus pencarian untuk melihat instrumen lain."
            />
          </div>
        ) : (
          <>
            {/* Mobile View: Responsive Cards */}
            <ul className="divide-y divide-[#EEEEEE] md:hidden">
              {result.data.map((item) => (
                <li key={item.assetCode} className="p-4">
                  <Link
                    href={`/plp/inventory/equipment/${item.assetCode}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <CatalogImage
                        mediaId={item.imageMediaId}
                        alt={item.typeName}
                        size={44}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-[#FDE68A] bg-[#FEF7E6] px-1.5 py-0.5 text-[9px] font-semibold text-[#8D6500]">
                            Instrumen
                          </span>
                          <p className="text-[13px] font-semibold text-[#121826] truncate">
                            {item.typeName}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">
                          {item.assetCode} · {item.roomName}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={item.availableUnits > 0 ? "font-bold text-[13px] text-[#16A34A] tabular-nums" : "font-bold text-[13px] text-[#DC2626] tabular-nums"}>
                          Tersedia {item.availableUnits}/{item.unitCount} unit
                        </span>
                        <StatusBadge
                          tone={
                            item.unitCount === 0
                              ? "rose"
                              : item.availableUnits === item.unitCount
                                ? "green"
                                : item.availableUnits > 0
                                  ? "yellow"
                                  : "rose"
                          }
                        >
                          {item.unitCount === 0
                            ? "Kosong"
                            : item.availableUnits === item.unitCount
                              ? "Tersedia Penuh"
                              : item.availableUnits > 0
                                ? "Tersedia Sebagian"
                                : "Tidak Tersedia"}
                        </StatusBadge>
                      </div>

                      {item.unitCount === 0 ? (
                        <p className="text-[11px] text-[#DC2626]">Belum ada unit fisik terdaftar</p>
                      ) : item.unitCount - item.availableUnits > 0 ? (
                        <p className="text-[11px] text-[#64748B]">
                          {item.unitCount - item.availableUnits} tidak tersedia (
                          {[
                            item.inUseUnits > 0 ? `${item.inUseUnits} dipakai` : null,
                            item.reservedUnits > 0 ? `${item.reservedUnits} booking` : null,
                            item.maintenanceUnits > 0 ? `${item.maintenanceUnits} maint` : null,
                          ].filter(Boolean).join(", ") || "non-aktif"}
                          )
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#16A34A]">Semua unit siap pakai</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B]">
                        <span>Kondisi {conditionMeta[item.condition]?.label ?? item.condition}</span>
                        <span>·</span>
                        <span>{item.usageType === "BORROWABLE" ? "Dapat Dipinjam" : "Di Tempat"}</span>
                        <span>·</span>
                        {item.activeRequests > 0 ? (
                          <span className="font-semibold text-[#8D6500]">
                            {item.activeRequests} permohonan aktif
                          </span>
                        ) : item.totalRequests > 0 ? (
                          <span>{item.totalRequests} permohonan terkait</span>
                        ) : (
                          <span className="text-[#94A3B8]">Belum ada permohonan</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Daftar instrumen laboratorium</caption>
                <thead>
                  <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                    <th scope="col" className="px-4 py-3 font-semibold">Instrumen</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Ruangan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Ketersediaan Unit</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kondisi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status Operasional</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Mode Pemakaian</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {result.data.map((item) => (
                    <tr key={item.assetCode} className="hover:bg-[#FAFAF8]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CatalogImage
                            mediaId={item.imageMediaId}
                            alt={item.typeName}
                            size={44}
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/plp/inventory/equipment/${item.assetCode}`}
                              className="font-bold text-[#212121] hover:underline"
                            >
                              {item.typeName}
                            </Link>
                            <p className="font-mono text-[11px] text-[#929292]">
                              {item.assetCode}
                            </p>
                            <p className="mt-0.5 text-[10px]">
                              {item.activeRequests > 0 ? (
                                <span className="inline-flex items-center font-medium text-[#8D6500] bg-[#FEF7E6] px-1.5 py-0.5 rounded border border-[#FDE68A]/70">
                                  {item.activeRequests} permohonan aktif
                                </span>
                              ) : item.totalRequests > 0 ? (
                                <span className="text-[#6B6B6B]">
                                  {item.totalRequests} permohonan terkait
                                </span>
                              ) : (
                                <span className="text-[#929292]">Belum ada permohonan</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                        {item.roomName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-mono text-[12px] font-bold tabular-nums">
                            <span className={item.availableUnits > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
                              Tersedia {item.availableUnits}/{item.unitCount} unit
                            </span>
                          </div>
                          {item.unitCount === 0 ? (
                            <p className="text-[10px] text-[#DC2626]">Belum ada unit terdaftar</p>
                          ) : item.unitCount - item.availableUnits > 0 ? (
                            <p className="text-[10px] text-[#6B6B6B] leading-tight">
                              {item.unitCount - item.availableUnits} tidak tersedia
                              {item.inUseUnits > 0 ? ` (${item.inUseUnits} dipakai` : ""}
                              {item.reservedUnits > 0 ? `${item.inUseUnits > 0 ? ", " : " ("}${item.reservedUnits} booking` : ""}
                              {item.maintenanceUnits > 0 ? `${item.inUseUnits > 0 || item.reservedUnits > 0 ? ", " : " ("}${item.maintenanceUnits} maint` : ""}
                              {(item.inUseUnits > 0 || item.reservedUnits > 0 || item.maintenanceUnits > 0) ? ")" : ""}
                            </p>
                          ) : (
                            <p className="text-[10px] text-[#16A34A]">Semua unit siap pakai</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={conditionMeta[item.condition]?.tone ?? "cream"}>
                          {conditionMeta[item.condition]?.label ?? item.condition}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            item.unitCount === 0
                              ? "rose"
                              : item.availableUnits === item.unitCount
                                ? "green"
                                : item.availableUnits > 0
                                  ? "yellow"
                                  : "rose"
                          }
                        >
                          {item.unitCount === 0
                            ? "Kosong"
                            : item.availableUnits === item.unitCount
                              ? "Tersedia Penuh"
                              : item.availableUnits > 0
                                ? "Tersedia Sebagian"
                                : "Tidak Tersedia"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#64748B]">
                        {item.usageType === "BORROWABLE" ? "Dapat Dipinjam" : "Di Tempat"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/plp/inventory/equipment/${item.assetCode}`}
                            className="inline-flex min-h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                          >
                            Kelola Unit →
                          </Link>
                          <DeleteConfirmButton
                            endpoint={`/api/plp/inventory/equipment/${item.assetCode}`}
                            title="Hapus Instrumen Laboratorium"
                            description="Apakah Anda yakin ingin menghapus instrumen ini beserta seluruh unit fisiknya? Data tidak dapat dipulihkan."
                            itemName={`${item.name} (${item.assetCode})`}
                            buttonVariant="icon"
                            disabled={item.status === "IN_USE"}
                            disabledReason="Instrumen sedang berstatus dipakai"
                          />
                        </div>
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
        basePath="/plp/inventory/instruments"
        query={{
          room: query.room,
          status: query.status,
          condition: query.condition,
          usage: query.usage,
          search: query.search,
        }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
