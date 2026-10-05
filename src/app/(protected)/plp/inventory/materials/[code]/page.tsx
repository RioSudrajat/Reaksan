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
import { DeleteConfirmButton } from "@/components/plp/delete-confirm-button";
import { QrTagDialog } from "@/components/qr/qr-tag-dialog";
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
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#121826] transition-colors hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua material
      </Link>

      <PageHeader
        eyebrow={material.code}
        title={material.name}
        description={`${material.category ?? "Material"} · unit ${material.unit}`}
        actions={
          <div className="flex items-center gap-3">
            <DeleteConfirmButton
              endpoint={`/api/plp/inventory/materials/${material.code}`}
              title="Hapus Katalog Bahan Kimia"
              description="Apakah Anda yakin ingin menghapus katalog bahan ini beserta seluruh batch fisiknya? Tindakan ini tidak dapat dibatalkan."
              itemName={`${material.name} (${material.code})`}
              buttonText="Hapus Bahan"
              buttonVariant="outline"
              redirectOnSuccess="/plp/inventory/materials"
              disabled={material.reserved > 0}
              disabledReason="Bahan masih memiliki alokasi reservasi aktif"
            />
            <ReceiveBatchDialog
              materialCode={material.code}
              materialName={material.name}
              unit={material.unit}
              rooms={rooms.map((r) => ({ id: r.id, code: r.id, name: r.name }))}
            />
          </div>
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
                    <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] uppercase tracking-[0.08em] text-[#64748B]">
                      <th scope="col" className="px-3 py-2.5 font-semibold">Lot</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Tag QR</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Room / Lokasi</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Fisik</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Reserved</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Tersedia</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Expiry</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {material.batches.map((batch) => (
                      <tr
                        key={batch.batchId}
                        className="border-b border-[#F1F0EC] transition-colors hover:bg-[#FDFBF7] last:border-0"
                      >
                        <th scope="row" className="px-3 py-2.5 text-[12px] font-semibold text-[#121826]">
                          {batch.lotNumber ?? "Tanpa lot"}
                        </th>
                        <td className="px-3 py-2.5 text-[12px]">
                          <QrTagDialog
                            item={{
                              targetType: "BATCH",
                              targetId: batch.batchId,
                              code: batch.lotNumber ?? material.code,
                              name: material.name,
                              classification: "MATERIAL",
                              storageLocation: batch.storageLocation,
                              qrCode: batch.qrCode,
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[#121826]">
                          <span>{batch.roomName}</span>
                          {batch.storageLocation && (
                            <span className="block text-[11px] text-[#64748B]">
                              📍 {batch.storageLocation}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          {batch.quantity} {material.unit}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          {batch.reserved} {material.unit}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[#121826] [font-variant-numeric:tabular-nums]">
                          {Math.max(0, batch.quantity - batch.reserved)}{" "}
                          {material.unit}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] [font-variant-numeric:tabular-nums]">
                          <span className={batch.expired ? "font-semibold text-[#DC2626]" : "text-[#121826]"}>
                            {formatDate(batch.expiryDate)}
                            {batch.expired ? " · kedaluwarsa" : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <StockAdjustDialog
                              batchId={batch.batchId}
                              lotNumber={batch.lotNumber}
                              roomName={batch.roomName}
                              currentQuantity={batch.quantity}
                              unit={material.unit}
                            />
                            <DeleteConfirmButton
                              endpoint={`/api/plp/inventory/materials/batches/${batch.batchId}`}
                              title="Hapus Batch Bahan Kimia"
                              description="Apakah Anda yakin ingin menghapus batch ini dari inventaris?"
                              itemName={`Lot: ${batch.lotNumber ?? "Tanpa lot"} (${batch.quantity} ${material.unit})`}
                              buttonVariant="icon"
                              disabled={batch.reserved > 0}
                              disabledReason="Batch memiliki alokasi reservasi aktif"
                            />
                          </div>
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
              <ul className="divide-y divide-[#E5E7EB]">
                {transactions.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[12px] font-semibold text-[#121826]">
                        {entry.type} · {entry.quantity} {material.unit}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#64748B]">
                        {entry.actorName ?? "Sistem"} ·{" "}
                        {formatDateTime(entry.createdAt)}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[11px] text-[#64748B] [font-variant-numeric:tabular-nums]">
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
                <dt className="text-[#64748B]">Fisik</dt>
                <dd className="font-medium text-[#121826] [font-variant-numeric:tabular-nums]">
                  {material.physical} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Reserved</dt>
                <dd className="font-medium text-[#121826] [font-variant-numeric:tabular-nums]">
                  {material.reserved} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Tersedia</dt>
                <dd className="font-bold text-[#121826] [font-variant-numeric:tabular-nums]">
                  {material.available} {material.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Expiry terdekat</dt>
                <dd className="font-medium text-[#121826]">
                  {formatDate(material.expiry)}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel context="Aturan" title="Dispensing rule">
            <p className="text-[12px] leading-5 text-[#121826]">
              {material.rule}
            </p>
            <p className="mt-2 text-[11px] leading-4 text-[#64748B]">
              Request material harus mengikuti minimum, increment, dan maximum
              ini agar stok tetap terkontrol.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
