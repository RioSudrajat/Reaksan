import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartEmpty,
  ChartPanel,
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
import { AddAssetDialog } from "@/components/plp/add-asset-dialog";
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
  return Array.isArray(value) ? value[0] : value;
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

const statusMeta: Record<string, { label: string; tone: ChartTone }> = {
  AVAILABLE: { label: "Tersedia", tone: "green" },
  RESERVED: { label: "Dipesan", tone: "blue" },
  IN_USE: { label: "Dipakai", tone: "yellow" },
  MAINTENANCE: { label: "Maintenance", tone: "amber" },
  DAMAGED: { label: "Rusak", tone: "rose" },
  UNDER_INSPECTION: { label: "Menunggu inspeksi", tone: "blue" },
  RETIRED: { label: "Pensiun", tone: "neutral" },
};

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
  const query = inventoryQuerySchema.parse({
    room: pick(params, "room"),
    status: pick(params, "status"),
    condition: pick(params, "condition"),
    usage: pick(params, "usage"),
    stock: pick(params, "stock") ?? "all",
    search: pick(params, "search"),
    limit,
    offset: (page - 1) * limit,
  });
  const [result, allRooms, equipmentTypes] = await Promise.all([
    listPlpEquipment({
      room: query.room,
      roomCodes,
      status: query.status,
      condition: query.condition,
      usage: query.usage,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    }),
    listRoomViews(),
    listEquipmentTypesForPlp(),
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
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      room: query.room,
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
        title="Equipment dan asset"
        description="Kondisi unit, status pemakaian, dan lokasi setiap asset untuk keputusan operasional PLP."
        actions={
          <AddAssetDialog
            rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
            equipmentTypes={equipmentTypes}
          />
        }
      />

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartPanel
          context="Status"
          title="Asset per status"
          range={`${result.stats.total} asset cocok dengan filter saat ini`}
          footnote="Menghitung asset, bukan unit. Klik status untuk memfilter daftar di bawah."
        >
          {result.stats.total === 0 ? (
            <ChartEmpty
              title="Tidak ada asset pada filter ini"
              description="Ubah filter untuk melihat sebaran status equipment."
            />
          ) : (
            <StatusBarList
              rows={equipmentStatusValues
                .map((status) => ({
                  key: status,
                  label: statusMeta[status]?.label ?? status,
                  value: result.stats.statusCounts[status] ?? 0,
                  tone: statusMeta[status]?.tone ?? "neutral",
                  href: filterHref({ status }),
                }))
                .filter((row) => row.value > 0)}
            />
          )}
        </ChartPanel>

        <ChartPanel
          context="Kondisi"
          title="Asset per kondisi"
          range={`${result.stats.total} asset cocok dengan filter saat ini`}
          footnote="Kondisi dicatat saat inspeksi. Klik kondisi untuk memfilter daftar."
        >
          {result.stats.total === 0 ? (
            <ChartEmpty
              title="Tidak ada asset pada filter ini"
              description="Ubah filter untuk melihat sebaran kondisi equipment."
            />
          ) : (
            <StatusBarList
              rows={conditionValues
                .map((condition) => ({
                  key: condition,
                  label: conditionMeta[condition]?.label ?? condition,
                  value: result.stats.conditionCounts[condition] ?? 0,
                  tone: conditionMeta[condition]?.tone ?? "neutral",
                  href: filterHref({ condition }),
                }))
                .filter((row) => row.value > 0)}
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
          <select name="room" defaultValue={query.room ?? ""} className={controlClass}>
            <option value="">Semua room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status unit" className="w-full sm:w-44">
          <select name="status" defaultValue={query.status ?? ""} className={controlClass}>
            <option value="">Semua status</option>
            {equipmentStatusValues.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Kondisi" className="w-full sm:w-40">
          <select
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
          </select>
        </FilterField>
        <FilterField label="Penggunaan" className="w-full sm:w-40">
          <select name="usage" defaultValue={query.usage ?? ""} className={controlClass}>
            <option value="">Semua tipe</option>
            <option value="BORROWABLE">Borrowable</option>
            <option value="USAGE_ONLY">Usage only</option>
          </select>
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
                        <p className="text-[13px] font-semibold text-[#212121]">
                          {asset.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#929292]">
                          {asset.assetCode} · {asset.roomName}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-[#212121]">
                      {asset.availableUnits}/{asset.unitCount} unit tersedia ·{" "}
                      {asset.usageType === "BORROWABLE"
                        ? "Borrowable"
                        : "Usage only"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      Kondisi {asset.condition.replaceAll("_", " ").toLowerCase()}
                      {asset.maintenanceUnits > 0
                        ? ` · ${asset.maintenanceUnits} perlu perhatian`
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
                  <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                    <th scope="col" className="px-4 py-3 font-semibold">Asset</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Room</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Penggunaan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Unit</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kondisi</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((asset) => (
                    <tr
                      key={asset.assetId}
                      className="border-b border-[#F1F0EC] last:border-0"
                    >
                      <th scope="row" className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CatalogImage
                            mediaId={asset.imageMediaId}
                            alt={asset.name}
                            size={40}
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#212121]">
                              {asset.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#929292]">
                              {asset.assetCode} · {asset.typeName}
                            </p>
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 text-[12px] text-[#212121]">
                        {asset.roomName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121]">
                        {asset.usageType === "BORROWABLE"
                          ? "Borrowable"
                          : "Usage only"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                        {asset.availableUnits} free · {asset.reservedUnits} reserved
                        · {asset.inUseUnits} in use
                        {asset.awaitingInspectionUnits > 0
                          ? ` · ${asset.awaitingInspectionUnits} inspeksi`
                          : ""}
                        {asset.maintenanceUnits > 0
                          ? ` · ${asset.maintenanceUnits} maintenance`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121]">
                        {asset.condition.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/plp/inventory/equipment/${asset.assetCode}`}
                          className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                        >
                          Detail
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
