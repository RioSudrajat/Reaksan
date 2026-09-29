import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartEmpty,
  ChartLink,
  ChartPanel,
  StackedBarChart,
} from "@/components/charts";
import { ExportLink } from "@/components/export-link";
import { CatalogImage } from "@/components/catalog-image";
import {
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  Pagination,
  Panel,
  controlClass,
  formatDate,
} from "@/components/workspace";
import { getExpiryTrend } from "@/services/analytics.service";
import { listRoomViews } from "@/services/catalog.service";
import { listPlpMaterials } from "@/services/plp.service";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { inventoryQuerySchema } from "@/validators/plp";

export const metadata: Metadata = { title: "Material Inventory" };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlpMaterialInventoryPage({
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
    stock: pick(params, "stock") ?? "all",
    expiry: pick(params, "expiry") ?? "all",
    search: pick(params, "search"),
    limit,
    offset: (page - 1) * limit,
  });
  const [result, allRooms, expiryTrend] = await Promise.all([
    listPlpMaterials({
      room: query.room,
      roomCodes,
      stock: query.stock,
      expiry: query.expiry,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    }),
    listRoomViews(),
    getExpiryTrend(8),
  ]);
  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((room) => roomCodes.includes(room.id));
  const activeFilterCount = [
    query.room,
    query.search,
    query.stock !== "all" ? query.stock : "",
    query.expiry !== "all" ? query.expiry : "",
  ].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(result.meta.total / limit));
  const expiryTotal = expiryTrend.withExpiry;

  return (
    <>
      <PageHeader
        eyebrow="Inventori"
        title="Material dan batch"
        description="Stok fisik, reserved, dan tersedia per material, lengkap dengan aturan dispensing dan expiry terdekat."
        actions={
          <>
            <ExportLink
              report="inventory-batches"
              query={{ room: query.room }}
              label="CSV batch"
            />
            <ExportLink report="low-stock" label="CSV low stock" />
            <Link
              href="/plp/inventory/opname"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Hitung stok
            </Link>
          </>
        }
      />

      <ChartPanel
        context="Expiry"
        title="Batch mendekati atau terlewat expiry"
        range={`${expiryTotal} batch memiliki tanggal expiry · ${expiryTrend.nearTerm} terlewat atau dalam 8 minggu ke depan`}
        legend={[
          { label: "Sudah terlewat", tone: "rose" },
          { label: "Dalam 5 minggu", tone: "yellow" },
          { label: "Minggu ke-6 dan seterusnya", tone: "amber" },
          {
            label: "Di luar 8 minggu",
            tone: "neutral",
            value:
              expiryTrend.buckets.find((bucket) => bucket.key === "later")
                ?.segments[0]?.value ?? 0,
          },
        ]}
        footnote={
          <>
            Hanya batch aktif dengan quantity lebih dari nol. Batch dengan expiry
            lebih dari 8 minggu ke depan tidak digambar di bar, hanya dihitung di
            legenda. Tindak lanjut stok lewat{" "}
            <ChartLink href="/plp/inventory/opname">sesi hitung stok</ChartLink>{" "}
            atau adjustment batch di admin workspace.
          </>
        }
        className="mb-5"
      >
        {expiryTotal === 0 ? (
          <ChartEmpty
            title="Belum ada batch dengan expiry"
            description="Batch dengan tanggal expiry akan muncul di sini per minggu."
          />
        ) : (
          <StackedBarChart
            buckets={expiryTrend.buckets
              .filter((bucket) => bucket.key !== "later")
              .map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                sublabel: bucket.sublabel,
                href:
                  bucket.key === "overdue"
                    ? "/plp/inventory/materials?expiry=expired"
                    : "/plp/inventory/materials?expiry=soon",
                segments: bucket.segments,
              }))}
            unit="batch"
            ariaLabel="Jumlah batch per minggu expiry"
          />
        )}
      </ChartPanel>

      <FilterBar
        action="/plp/inventory/materials"
        activeCount={activeFilterCount}
        clearHref="/plp/inventory/materials"
      >
        <FilterField label="Cari" className="w-full sm:w-56">
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Kode atau nama material"
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
        <FilterField label="Stok" className="w-full sm:w-40">
          <select name="stock" defaultValue={query.stock} className={controlClass}>
            <option value="all">Semua stok</option>
            <option value="low">Menipis</option>
            <option value="out">Habis</option>
          </select>
        </FilterField>
        <FilterField label="Expiry" className="w-full sm:w-44">
          <select name="expiry" defaultValue={query.expiry} className={controlClass}>
            <option value="all">Semua expiry</option>
            <option value="soon">Mendekati expiry</option>
            <option value="expired">Sudah terlewat</option>
          </select>
        </FilterField>
      </FilterBar>

      <Panel padded={false}>
        {result.data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada material yang cocok"
              description="Ubah filter pencarian atau pilih kategori lain."
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#EEEEEE] md:hidden">
              {result.data.map((material) => (
                <li
                  key={`${material.materialId}:${material.roomCode}`}
                  className="p-4"
                >
                  <Link
                    href={`/plp/inventory/materials/${material.code}?room=${material.roomCode}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <CatalogImage
                          mediaId={material.imageMediaId}
                          alt={material.name}
                          size={44}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#212121]">
                            {material.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#929292]">
                            {material.code} · {material.category ?? "Material"}{" "}
                            · {material.roomName}
                          </p>
                        </div>
                      </div>
                      {(material.lowStock || material.outOfStock) && (
                        <span className="rounded-full bg-[#FFF4D9] px-2.5 py-1 text-[11px] font-bold text-[#705012]">
                          {material.outOfStock ? "Habis" : "Menipis"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                      Fisik {material.physical} · reserved {material.reserved} ·
                      tersedia {material.available} {material.unit}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                      {material.batches.length} batch
                      {material.expiry
                        ? ` · expiry terdekat ${formatDate(material.expiry)}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Inventori material dan stok</caption>
                <thead>
                  <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                    <th scope="col" className="px-4 py-3 font-semibold">Material</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Stok</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Dispensing rule</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Batch</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Expiry</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((material) => (
                    <tr
                      key={`${material.materialId}:${material.roomCode}`}
                      className="border-b border-[#F1F0EC] last:border-0"
                    >
                      <th scope="row" className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CatalogImage
                            mediaId={material.imageMediaId}
                            alt={material.name}
                            size={40}
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#212121]">
                              {material.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#929292]">
                              {material.code} · {material.category ?? "Material"}{" "}
                              · {material.roomName}
                            </p>
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                        Fisik {material.physical} {material.unit}
                        <br />
                        Reserved {material.reserved} · Tersedia{" "}
                        {material.available} {material.unit}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B6B6B]">
                        {material.rule}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                        {material.batches.length}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                        {formatDate(material.expiry)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                            (material.outOfStock
                              ? "bg-[#FDE9E9] text-[#9E3636]"
                              : material.lowStock
                                ? "bg-[#FFF4D9] text-[#705012]"
                                : "bg-[#E5F5ED] text-[#03683A]")
                          }
                        >
                          {material.outOfStock
                            ? "Habis"
                            : material.lowStock
                              ? "Menipis"
                              : "Aman"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/plp/inventory/materials/${material.code}?room=${material.roomCode}`}
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
        basePath="/plp/inventory/materials"
        query={{
          room: query.room,
          stock: query.stock,
          expiry: query.expiry,
          search: query.search,
        }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
