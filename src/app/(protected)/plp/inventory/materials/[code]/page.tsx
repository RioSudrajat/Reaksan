import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ChartPanel,
  HorizontalBarChart,
  type ChartTone,
} from "@/components/charts";
import { ExportLink } from "@/components/export-link";
import { CatalogImage } from "@/components/catalog-image";
import {
  EmptyState,
  PageHeader,
  Panel,
  formatDate,
  formatDateTime,
} from "@/components/workspace";
import { getPlpMaterialDetail } from "@/services/plp.service";
import { listRoomViews } from "@/services/catalog.service";
import { ReceiveBatchDialog } from "@/components/plp/receive-batch-dialog";
import { StockAdjustDialog } from "@/components/plp/stock-adjust-dialog";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";

export const metadata: Metadata = { title: "Material Detail" };

export default async function PlpMaterialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const room = typeof query.room === "string" ? query.room : undefined;
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const roomCodes = scopeRoomCodes(scope);
  const [detail, allRooms] = await Promise.all([
    getPlpMaterialDetail(code, {
      room,
      roomCodes,
    }),
    listRoomViews(),
  ]);
  if (!detail) notFound();
  const { material, transactions } = detail;
  const rooms =
    roomCodes === null
      ? allRooms
      : allRooms.filter((r) => roomCodes.includes(r.id));

  return (
    <>
      <Link
        href="/plp/inventory/materials"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua material
      </Link>

      <PageHeader
        eyebrow={material.code}
        title={material.name}
        description={`${material.category ?? "Material"} · unit ${material.unit}`}
        actions={
          <ReceiveBatchDialog
            materialCode={material.code}
            materialName={material.name}
            unit={material.unit}
            rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
          />
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <ChartPanel
            context="Batch"
            title="Stok tersedia per batch"
            range={`${material.batches.length} batch · unit ${material.unit}`}
            legend={[
              { label: "Tersedia", tone: "green" },
              { label: "Sebagian sudah reserved", tone: "yellow" },
              { label: "Terlewat expiry", tone: "rose" },
            ]}
            footnote="Bar memakai jumlah tersedia (fisik dikurangi reserved) pada unit yang sama, bukan total lintas material."
          >
            {material.batches.length === 0 ? (
              <EmptyState
                title="Belum ada batch"
                description="Gunakan tombol 'Terima Batch Baru' untuk mencatat batch pertama di ruangan Anda."
              />
            ) : (
              <HorizontalBarChart
                rows={material.batches.map((batch) => {
                  const available = Math.max(0, batch.quantity - batch.reserved);
                  const tone: ChartTone = batch.expired
                    ? "rose"
                    : batch.reserved > 0
                      ? "yellow"
                      : "green";
                  return {
                    key: batch.batchId,
                    label: `${batch.lotNumber ?? "Tanpa lot"} · ${batch.roomName}`,
                    sublabel: batch.expiryDate
                      ? `Expiry ${formatDate(batch.expiryDate)}${
                          batch.expired ? " · terlewat" : ""
                        }`
                      : "Tanpa tanggal expiry",
                    value: available,
                    tone,
                    detail: `Fisik ${batch.quantity} · reserved ${batch.reserved} ${material.unit}`,
                  };
                })}
                unit={material.unit}
                threshold={
                  material.minimum
                    ? {
                        value: material.minimum,
                        label: `Ambang minimum ${material.minimum} ${material.unit}`,
                      }
                    : undefined
                }
              />
            )}
          </ChartPanel>

          <Panel
            context={`${material.batches.length} batch`}
            title="Batch dan expiry"
          >
            {material.batches.length === 0 ? (
              <EmptyState
                title="Belum ada batch"
                description="Gunakan tombol 'Terima Batch Baru' untuk mencatat batch pertama di ruangan Anda."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Daftar batch material</caption>
                  <thead>
                    <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                      <th scope="col" className="px-3 py-2 font-semibold">Lot</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Room</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Fisik</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Reserved</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Tersedia</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Expiry</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {material.batches.map((batch) => (
                      <tr
                        key={batch.batchId}
                        className="border-b border-[#F1F0EC] last:border-0"
                      >
                        <th scope="row" className="px-3 py-2 text-[12px] font-semibold text-[#212121]">
                          {batch.lotNumber ?? "Tanpa lot"}
                        </th>
                        <td className="px-3 py-2 text-[12px] text-[#212121]">
                          {batch.roomName}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                          {batch.quantity} {material.unit}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                          {batch.reserved} {material.unit}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-[#212121] [font-variant-numeric:tabular-nums]">
                          {Math.max(0, batch.quantity - batch.reserved)}{" "}
                          {material.unit}
                        </td>
                        <td className="px-3 py-2 text-[12px] [font-variant-numeric:tabular-nums]">
                          <span className={batch.expired ? "font-semibold text-[#9E3636]" : "text-[#212121]"}>
                            {formatDate(batch.expiryDate)}
                            {batch.expired ? " · kedaluwarsa" : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <StockAdjustDialog
                            batchId={batch.batchId}
                            lotNumber={batch.lotNumber}
                            roomName={batch.roomName}
                            currentQuantity={batch.quantity}
                            unit={material.unit}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            context="Ledger"
            title="Riwayat stok terakhir"
            action={
              <ExportLink
                report="stock-transactions"
                query={{ material: material.code }}
              />
            }
          >
            {transactions.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi stok"
                description="Reserve, issue, receive, dan adjustment akan tercatat di sini."
              />
            ) : (
              <ul className="divide-y divide-[#EEEEEE]">
                {transactions.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[12px] font-semibold text-[#212121]">
                        {entry.type} · {entry.quantity} {material.unit}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                        {entry.actorName ?? "Sistem"} ·{" "}
                        {formatDateTime(entry.createdAt)}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                      {entry.beforeQuantity} → {entry.afterQuantity}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel context="Stok" title="Ringkasan">
            <CatalogImage
              mediaId={material.imageMediaId}
              alt={material.name}
              size={96}
              className="mb-4"
            />
            <dl className="space-y-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Fisik</dt>
                <dd className="font-medium text-[#212121] [font-variant-numeric:tabular-nums]">
                  {material.physical} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Reserved</dt>
                <dd className="font-medium text-[#212121] [font-variant-numeric:tabular-nums]">
                  {material.reserved} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Tersedia</dt>
                <dd className="font-bold text-[#212121] [font-variant-numeric:tabular-nums]">
                  {material.available} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#929292]">Expiry terdekat</dt>
                <dd className="font-medium text-[#212121]">
                  {formatDate(material.expiry)}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel context="Aturan" title="Dispensing rule">
            <p className="text-[12px] leading-5 text-[#212121]">
              {material.rule}
            </p>
            <p className="mt-2 text-[11px] leading-4 text-[#6B6B6B]">
              Request material harus mengikuti minimum, increment, dan maximum
              ini agar stok tetap terkontrol.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
