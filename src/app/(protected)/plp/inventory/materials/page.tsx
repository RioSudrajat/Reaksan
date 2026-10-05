import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartEmpty,
  ChartLink,
  ChartPanel,
  HorizontalBarChart,
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
import { getExpiryTrend, getTopUsage } from "@/services/analytics.service";
import { listRoomViews } from "@/services/catalog.service";
import { listPlpMaterials } from "@/services/plp.service";
import { AddMaterialDialog } from "@/components/plp/add-material-dialog";
import { DeleteConfirmButton } from "@/components/plp/delete-confirm-button";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
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
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.trim().length > 0 ? str.trim() : undefined;
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
  const scopedRoomCodes = query.room
    ? roomCodes
      ? roomCodes.filter((c) => c === query.room)
      : [query.room]
    : roomCodes;
  const [result, allRooms, expiryTrend, topUsage] = await Promise.all([
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
    getExpiryTrend(8, scopedRoomCodes),
    getTopUsage({ days: 30, roomCode: query.room, roomCodes }),
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
            <AddMaterialDialog
              rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
            />
            <ExportLink
              report="inventory-batches"
              query={{ room: query.room }}
              label="CSV batch"
            />
            <ExportLink report="low-stock" label="CSV low stock" />
            <Link
              href="/plp/inventory/opname"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] transition hover:bg-[#E5A700] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] shadow-xs"
            >
              Hitung stok
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <ChartPanel
          context="Permohonan (30 Hari)"
          title="Permintaan & Konsumsi Bahan Kimia Terbanyak"
          range={`${topUsage.materials.reduce((acc, curr) => acc + curr.totalRequests, 0)} permohonan kebutuhan bahan kimia`}
          footnote="Data kebutuhan bahan kimia real-time dari seluruh permohonan yang aktif / disetujui dalam 30 hari terakhir."
        >
          {topUsage.materials.length === 0 ? (
            <ChartEmpty
              title="Belum ada permohonan bahan kimia"
              description="Bahan kimia yang diajukan dalam permohonan praktikum atau penelitian akan otomatis muncul di grafik ini."
            />
          ) : (
            <HorizontalBarChart
              unit="permohonan"
              rows={topUsage.materials.slice(0, 5).map((item) => ({
                key: item.id,
                label: item.name,
                sublabel: `${item.totalRequests} permohonan · Total diminta: ${item.totalQuantity} ${item.unit}`,
                value: item.totalRequests,
                tone: "amber" as const,
              }))}
            />
          )}
        </ChartPanel>

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
      </div>

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
        <FilterField label="Stok" className="w-full sm:w-40">
          <AutoSubmitSelect
            name="stock"
            defaultValue={query.stock}
            className={controlClass}
          >
            <option value="all">Semua stok</option>
            <option value="low">Menipis</option>
            <option value="out">Habis</option>
          </AutoSubmitSelect>
        </FilterField>
        <FilterField label="Expiry" className="w-full sm:w-44">
          <AutoSubmitSelect
            name="expiry"
            defaultValue={query.expiry}
            className={controlClass}
          >
            <option value="all">Semua expiry</option>
            <option value="soon">Mendekati expiry</option>
            <option value="expired">Sudah terlewat</option>
          </AutoSubmitSelect>
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
              {result.data.map((material) => {
                const availableBatchesCount = material.batches.filter(
                  (b) => b.active && !b.expired && b.quantity > b.reserved
                ).length;
                const totalBatchesCount = material.batches.length;

                return (
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
                            <p className="mt-0.5 text-[10px]">
                              {material.activeRequests > 0 ? (
                                <span className="inline-flex items-center font-medium text-[#8D6500] bg-[#FEF7E6] px-1.5 py-0.5 rounded border border-[#FDE68A]/70">
                                  {material.activeRequests} permohonan aktif ({material.totalRequestedQuantity} {material.unit})
                                </span>
                              ) : material.totalRequests > 0 ? (
                                <span className="text-[#64748B]">
                                  {material.totalRequests} permohonan terkait ({material.totalRequestedQuantity} {material.unit})
                                </span>
                              ) : (
                                <span className="text-[#94A3B8]">Belum ada permohonan</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {(material.lowStock || material.outOfStock) && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              material.outOfStock
                                ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                                : "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                            }`}
                          >
                            {material.outOfStock ? "Habis" : "Menipis"}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-0.5 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                        <div>
                          <span className={material.available > 0 ? "font-bold text-[#16A34A]" : "font-bold text-[#DC2626]"}>
                            Tersedia {material.available}/{material.totalCapacity} {material.unit}
                          </span>
                          {material.reserved > 0 && material.issued > 0 ? (
                            <span className="text-[11px] text-[#8D6500] ml-1.5 font-normal">
                              ({material.reserved} reserved · {material.issued} terpakai)
                            </span>
                          ) : material.reserved > 0 ? (
                            <span className="text-[11px] text-[#8D6500] ml-1.5 font-normal">
                              ({material.reserved} {material.unit} reserved)
                            </span>
                          ) : material.issued > 0 ? (
                            <span className="text-[11px] text-[#4B5563] ml-1.5 font-normal">
                              ({material.issued} {material.unit} terpakai)
                            </span>
                          ) : material.totalCapacity === 0 ? (
                            <span className="text-[11px] text-[#DC2626] ml-1.5 font-normal">
                              (Stok habis)
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          {totalBatchesCount === 0 ? (
                            <span className="text-[#DC2626]">Belum ada batch</span>
                          ) : (
                            <span>Tersedia {availableBatchesCount}/{totalBatchesCount} batch</span>
                          )}
                          {material.expiry
                            ? ` · Expiry terdekat ${formatDate(material.expiry)}`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Inventori material dan stok</caption>
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] uppercase tracking-[0.08em] text-[#64748B]">
                    <th scope="col" className="px-4 py-3 font-semibold">Material</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Ketersediaan Stok</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Dispensing rule</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Batch</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Expiry</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((material) => {
                    const availableBatchesCount = material.batches.filter(
                      (b) => b.active && !b.expired && b.quantity > b.reserved
                    ).length;
                    const totalBatchesCount = material.batches.length;

                    return (
                      <tr
                        key={`${material.materialId}:${material.roomCode}`}
                        className="border-b border-[#F1F0EC] transition-colors hover:bg-[#FDFBF7] last:border-0"
                      >
                        <th scope="row" className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CatalogImage
                              mediaId={material.imageMediaId}
                              alt={material.name}
                              size={40}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#121826]">
                                {material.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#64748B]">
                                {material.code} · {material.category ?? "Material"}{" "}
                                · {material.roomName}
                              </p>
                              <p className="mt-0.5 text-[10px]">
                                {material.activeRequests > 0 ? (
                                  <span className="inline-flex items-center font-medium text-[#8D6500] bg-[#FEF7E6] px-1.5 py-0.5 rounded border border-[#FDE68A]/70">
                                    {material.activeRequests} permohonan aktif ({material.totalRequestedQuantity} {material.unit})
                                  </span>
                                ) : material.totalRequests > 0 ? (
                                  <span className="text-[#64748B]">
                                    {material.totalRequests} permohonan terkait ({material.totalRequestedQuantity} {material.unit})
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">Belum ada permohonan</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </th>
                        <td className="px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          <div className="font-mono font-bold">
                            <span className={material.available > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
                              Tersedia {material.available}/{material.totalCapacity} {material.unit}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#64748B] leading-tight mt-0.5">
                            {material.reserved > 0 && material.issued > 0 ? (
                              <span className="text-[#8D6500]">
                                {material.reserved} {material.unit} reserved · {material.issued} {material.unit} terpakai
                              </span>
                            ) : material.reserved > 0 ? (
                              <span className="text-[#8D6500]">
                                {material.reserved} {material.unit} dialokasikan/reserved
                              </span>
                            ) : material.issued > 0 ? (
                              <span className="text-[#4B5563]">
                                {material.issued} {material.unit} telah digunakan/diambil
                              </span>
                            ) : material.totalCapacity === 0 ? (
                              <span className="text-[#DC2626]">
                                Stok habis / belum tersedia
                              </span>
                            ) : (
                              "Semua stok fisik siap pakai"
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">
                          {material.rule}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          <div className="font-mono font-semibold">
                            <span className={availableBatchesCount > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
                              Tersedia {availableBatchesCount}/{totalBatchesCount} batch
                            </span>
                          </div>
                          {totalBatchesCount === 0 ? (
                            <p className="text-[10px] text-[#DC2626] leading-tight mt-0.5">
                              Belum ada batch terdaftar
                            </p>
                          ) : totalBatchesCount - availableBatchesCount > 0 ? (
                            <p className="text-[10px] text-[#DC2626] leading-tight mt-0.5">
                              {totalBatchesCount - availableBatchesCount} batch kadaluarsa/habis
                            </p>
                          ) : (
                            <p className="text-[10px] text-[#64748B] leading-tight mt-0.5">
                              {totalBatchesCount} batch aktif
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          {formatDate(material.expiry)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold " +
                              (material.outOfStock
                                ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                                : material.lowStock
                                  ? "border-[#FDE68A] bg-[#FEF7E6] text-[#8D6500]"
                                  : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]")
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
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/plp/inventory/materials/${material.code}?room=${material.roomCode}`}
                              className="inline-flex min-h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-semibold text-[#121826] transition-colors hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                            >
                              Detail
                            </Link>
                            <DeleteConfirmButton
                              endpoint={`/api/plp/inventory/materials/${material.code}`}
                              title="Hapus Katalog Bahan Kimia"
                              description="Apakah Anda yakin ingin menghapus katalog bahan ini beserta seluruh batch fisiknya? Tindakan ini tidak dapat dibatalkan."
                              itemName={`${material.name} (${material.code})`}
                              buttonVariant="icon"
                              disabled={material.reserved > 0}
                              disabledReason="Bahan masih memiliki alokasi reservasi aktif"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
