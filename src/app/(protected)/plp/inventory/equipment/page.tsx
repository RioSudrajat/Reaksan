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
import { AddAssetDialog } from "@/components/plp/add-asset-dialog";
import { DeleteConfirmButton } from "@/components/plp/delete-confirm-button";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { inventoryQuerySchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Equipment Inventory" };

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

const conditionMeta: Record<string, { label: string; tone: ChartTone }> = {
  GOOD: { label: "Baik", tone: "green" },
  MINOR_ISSUE: { label: "Masalah minor", tone: "yellow" },
  DAMAGED: { label: "Rusak", tone: "rose" },
  UNKNOWN: { label: "Belum diketahui", tone: "neutral" },
};

export default async function PlpEquipmentInventoryPage({
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
  const classification = "TOOL";
  const query = inventoryQuerySchema.parse({
    room: pick(params, "room") || defaultRoom,
    classification,
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
      classification: query.classification,
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
    query.classification !== "TOOL" ? query.classification : undefined,
    query.status,
    query.condition,
    query.usage,
    query.search,
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));

  const filterHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      room: query.room,
      classification: query.classification,
      status: query.status,
      condition: query.condition,
      usage: query.usage,
      search: query.search,
      ...overrides,
    })) {
      if (value) params.set(key, value);
    }
    const suffix = params.toString();
    return suffix
      ? `/plp/inventory/equipment?${suffix}`
      : "/plp/inventory/equipment";
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventori"
        title="Alat Praktikum & Glassware"
        description="Pantau kondisi fisik, penempatan meja praktikum, dan status pemakaian alat gelas dan perkakas laboratorium."
        actions={
          <AddAssetDialog
            label="+ Tambah Alat / Glassware"
            defaultClassification="TOOL"
            defaultStorageLocation="Meja Praktikum 1-4"
            rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
            equipmentTypes={equipmentTypes}
          />
        }
      />


      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartPanel
          context="Unit Fisik"
          title="Ketersediaan & Status Unit Alat"
          range={`${result.stats.unitStats?.totalUnits ?? 0} total unit alat · ${result.stats.unitStats?.availableUnits ?? 0} unit tersedia`}
          footnote="Menghitung ketersediaan unit fisik real-time dari alat/glassware yang terdaftar."
        >
          {(result.stats.unitStats?.totalUnits ?? 0) === 0 ? (
            <ChartEmpty
              title="Tidak ada asset pada filter ini"
              description="Ubah filter untuk melihat sebaran status equipment."
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
                  label: "Perlu Perhatian / Rusak",
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
          title="Alat & Glassware Paling Sering Diajukan"
          range={`${topUsage.tools.reduce((acc, curr) => acc + curr.totalRequests, 0)} permohonan penggunaan alat`}
          footnote="Data pemakaian alat real-time dari seluruh permohonan aktif / disetujui dalam 30 hari terakhir."
        >
          {topUsage.tools.length === 0 ? (
            <ChartEmpty
              title="Belum ada aktivitas peminjaman alat"
              description="Alat dan perkakas yang diajukan dalam permohonan akan otomatis muncul di grafik ini."
            />
          ) : (
            <HorizontalBarChart
              unit="permohonan"
              rows={topUsage.tools.slice(0, 5).map((item) => ({
                key: item.id,
                label: item.name,
                sublabel: `${item.totalRequests} permohonan · ${item.totalDaysBorrowed} hari pemakaian`,
                value: item.totalRequests,
                tone: "blue" as const,
              }))}
            />
          )}
        </ChartPanel>
      </div>

      <FilterBar
        action="/plp/inventory/equipment"
        activeCount={activeFilterCount}
        clearHref="/plp/inventory/equipment"
      >
        <FilterField label="Cari" className="w-full sm:w-56">
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Kode atau nama asset"
            className={controlClass}
          />
        </FilterField>
        <FilterField label="Room" className="w-full sm:w-44">
          <AutoSubmitSelect
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
          </AutoSubmitSelect>
        </FilterField>
        <FilterField label="Status unit" className="w-full sm:w-44">
          <AutoSubmitSelect
            name="status"
            defaultValue={query.status ?? ""}
            className={controlClass}
          >
            <option value="">Semua status</option>
            {equipmentStatusValues.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </AutoSubmitSelect>
        </FilterField>
        <FilterField label="Kondisi" className="w-full sm:w-40">
          <AutoSubmitSelect
            name="condition"
            defaultValue={query.condition ?? ""}
            className={controlClass}
          >
            <option value="">Semua kondisi</option>
            {conditionValues.map((condition) => (
              <option key={condition} value={condition}>
                {condition.replaceAll("_", " ")}
              </option>
            ))}
          </AutoSubmitSelect>
        </FilterField>
        <FilterField label="Penggunaan" className="w-full sm:w-40">
          <AutoSubmitSelect
            name="usage"
            defaultValue={query.usage ?? ""}
            className={controlClass}
          >
            <option value="">Semua tipe</option>
            <option value="BORROWABLE">Borrowable</option>
            <option value="USAGE_ONLY">Usage only</option>
          </AutoSubmitSelect>
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada asset yang cocok"
              description="Ubah filter atau gunakan tombol 'Tambah Asset ke Ruangan' di atas."
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#EEEEEE] md:hidden">
              {result.data.map((asset) => (
                <li key={asset.assetId} className="p-4">
                  <Link
                    href={`/plp/inventory/equipment/${asset.assetCode}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <CatalogImage
                        mediaId={asset.imageMediaId}
                        alt={asset.name}
                        size={44}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-1.5 py-0.5 text-[9px] font-semibold text-[#64748B]">
                            {asset.classification === "TOOL" ? "Alat / Glassware" : "Instrumen"}
                          </span>
                          <p className="text-[13px] font-semibold text-[#121826]">
                            {asset.name}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                          {asset.assetCode} · {asset.roomName}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-[#121826]">
                      <span className={asset.availableUnits > 0 ? "font-bold text-[#16A34A]" : "font-bold text-[#DC2626]"}>
                        Tersedia {asset.availableUnits}/{asset.unitCount} unit
                      </span>{" "}
                      ·{" "}
                      {asset.usageType === "BORROWABLE"
                        ? "Borrowable"
                        : "Usage only"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748B]">
                      {asset.unitCount === 0 ? (
                        <span className="text-[#DC2626]">Belum ada unit terdaftar · </span>
                      ) : asset.unitCount - asset.availableUnits > 0 ? (
                        <span>
                          {asset.unitCount - asset.availableUnits} tidak tersedia (
                          {[
                            asset.inUseUnits > 0 ? `${asset.inUseUnits} dipakai` : null,
                            asset.reservedUnits > 0 ? `${asset.reservedUnits} dipesan` : null,
                            asset.maintenanceUnits > 0 ? `${asset.maintenanceUnits} maint` : null,
                          ].filter(Boolean).join(", ") || "non-aktif"}
                          ) ·{" "}
                        </span>
                      ) : (
                        <span className="text-[#16A34A]">Semua unit siap pakai · </span>
                      )}
                      Kondisi {asset.condition.replaceAll("_", " ").toLowerCase()}
                      {asset.activeRequests > 0
                        ? ` · ${asset.activeRequests} permohonan aktif`
                        : asset.totalRequests > 0
                          ? ` · ${asset.totalRequests} permohonan`
                          : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Inventori equipment per asset</caption>
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#94A3B8]">
                    <th scope="col" className="px-4 py-3 font-semibold">Asset</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Room</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Penggunaan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Ketersediaan Unit</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kondisi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((asset) => (
                    <tr
                      key={asset.assetId}
                      className="border-b border-[#F1F3F5] transition hover:bg-[#F8F9FA]/80 last:border-0"
                    >
                      <th scope="row" className="px-4 py-3 font-normal">
                        <div className="flex items-center gap-3">
                          <CatalogImage
                            mediaId={asset.imageMediaId}
                            alt={asset.name}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-1.5 py-0.5 text-[9px] font-semibold text-[#64748B]">
                                {asset.classification === "TOOL" ? "Alat / Glassware" : "Instrumen"}
                              </span>
                              <p className="text-[13px] font-semibold text-[#121826]">
                                {asset.name}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                              {asset.assetCode} · {asset.typeName}
                            </p>
                            <p className="mt-0.5 text-[10px]">
                              {asset.activeRequests > 0 ? (
                                <span className="inline-flex items-center font-medium text-[#8D6500] bg-[#FEF7E6] px-1.5 py-0.5 rounded border border-[#FDE68A]/70">
                                  {asset.activeRequests} permohonan aktif
                                </span>
                              ) : asset.totalRequests > 0 ? (
                                <span className="text-[#64748B]">
                                  {asset.totalRequests} permohonan terkait
                                </span>
                              ) : (
                                <span className="text-[#94A3B8]">Belum ada permohonan</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 text-[12px] text-[#121826]">
                        {asset.roomName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#121826]">
                        {asset.usageType === "BORROWABLE"
                          ? "Borrowable"
                          : "Usage only"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                        <div className="space-y-0.5">
                          <div className="font-mono text-[12px] font-bold tabular-nums">
                            <span className={asset.availableUnits > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
                              Tersedia {asset.availableUnits}/{asset.unitCount} unit
                            </span>
                          </div>
                          {asset.unitCount === 0 ? (
                            <p className="text-[10px] text-[#DC2626] leading-tight">Belum ada unit terdaftar</p>
                          ) : asset.unitCount - asset.availableUnits > 0 ? (
                            <p className="text-[10px] text-[#6B6B6B] leading-tight">
                              {asset.unitCount - asset.availableUnits} tidak tersedia
                              {asset.inUseUnits > 0 ? ` (${asset.inUseUnits} dipakai` : ""}
                              {asset.reservedUnits > 0 ? `${asset.inUseUnits > 0 ? ", " : " ("}${asset.reservedUnits} dipesan` : ""}
                              {asset.maintenanceUnits > 0 ? `${asset.inUseUnits > 0 || asset.reservedUnits > 0 ? ", " : " ("}${asset.maintenanceUnits} maint` : ""}
                              {(asset.inUseUnits > 0 || asset.reservedUnits > 0 || asset.maintenanceUnits > 0) ? ")" : ""}
                            </p>
                          ) : (
                            <p className="text-[10px] text-[#16A34A]">Semua unit siap pakai</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#121826]">
                        {conditionMeta[asset.condition]?.label ?? asset.condition.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/plp/inventory/equipment/${asset.assetCode}`}
                            className="inline-flex min-h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                          >
                            Detail
                          </Link>
                          <DeleteConfirmButton
                            endpoint={`/api/plp/inventory/equipment/${asset.assetCode}`}
                            title="Hapus Aset Peralatan"
                            description="Apakah Anda yakin ingin menghapus aset ini beserta seluruh unit fisiknya? Data tidak dapat dipulihkan."
                            itemName={`${asset.name} (${asset.assetCode})`}
                            buttonVariant="icon"
                            disabled={asset.status === "IN_USE"}
                            disabledReason="Aset sedang berstatus dipakai"
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
        basePath="/plp/inventory/equipment"
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
