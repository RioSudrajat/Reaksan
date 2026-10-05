import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import {
  EmptyState,
  PageHeader,
  Panel,
  formatRange,
} from "@/components/workspace";
import { getPlpEquipmentDetail } from "@/services/plp.service";
import { requirePermission } from "@/lib/session";
import {
  getRoomScope,
  scopeRoomCodes,
} from "@/services/access-scope.service";
import { UnitStatusAction } from "@/components/plp/unit-status-action";
import { AddUnitDialog } from "@/components/plp/add-unit-dialog";
import { DeleteConfirmButton } from "@/components/plp/delete-confirm-button";
import { QrTagDialog } from "@/components/qr/qr-tag-dialog";

export const metadata: Metadata = { title: "Asset Detail" };

export default async function PlpEquipmentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { user } = await requirePermission({ plp: ["view"] });
  const scope = await getRoomScope(user.id, user.role);
  const detail = await getPlpEquipmentDetail(code, scopeRoomCodes(scope));
  if (!detail) notFound();
  const { asset, reservations } = detail;

  return (
    <>
      <Link
        href="/plp/inventory/equipment"
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#121826] transition hover:bg-[#F8F9FA] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Semua equipment
      </Link>

      <PageHeader
        eyebrow={asset.assetCode}
        title={asset.name}
        description={`${asset.typeName} · ${asset.roomName} · ${
          asset.usageType === "BORROWABLE" ? "Borrowable" : "Usage only"
        }`}
        actions={
          <div className="flex items-center gap-3">
            <DeleteConfirmButton
              endpoint={`/api/plp/inventory/equipment/${asset.assetCode}`}
              title="Hapus Aset Peralatan"
              description="Apakah Anda yakin ingin menghapus aset ini beserta seluruh unit fisiknya? Data tidak dapat dipulihkan."
              itemName={`${asset.name} (${asset.assetCode})`}
              buttonText="Hapus Aset"
              buttonVariant="outline"
              redirectOnSuccess="/plp/inventory/equipment"
              disabled={asset.status === "IN_USE"}
              disabledReason="Aset sedang berstatus dipakai"
            />
            <CatalogImage mediaId={asset.imageMediaId} alt={asset.name} size={72} />
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel
          context={`${asset.unitCount} unit`}
          title="Unit dan kondisi"
          action={
            <AddUnitDialog
              assetCode={asset.assetCode}
              assetName={asset.name}
              suggestedUnitCode={`${asset.assetCode}-U${asset.units.length + 1}`}
            />
          }
        >
          {asset.units.length === 0 ? (
            <EmptyState
              title="Belum ada unit"
              description="Gunakan tombol 'Tambah Unit Fisik' untuk mendaftarkan unit agar bisa direservasi."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Daftar unit asset</caption>
                <thead>
                  <tr className="border-b border-[#EEEEEE] text-[11px] uppercase tracking-[0.08em] text-[#929292]">
                    <th scope="col" className="px-3 py-2 font-semibold">Kode</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Tag QR</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Label</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Lokasi Meja/Rak</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Kondisi</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Catatan</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.units.map((unit) => (
                    <tr
                      key={unit.unitId}
                      className="border-b border-[#F1F0EC] last:border-0"
                    >
                      <th scope="row" className="px-3 py-2 text-[12px] font-semibold text-[#212121]">
                        {unit.code}
                      </th>
                      <td className="px-3 py-2 text-[12px]">
                        <QrTagDialog
                          item={{
                            targetType: "UNIT",
                            targetId: unit.unitId,
                            code: unit.code,
                            name: `${asset.name} (${unit.label})`,
                            classification: asset.classification,
                            storageLocation: unit.storageLocation,
                            qrCode: unit.qrCode,
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#212121]">
                        {unit.label}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#6B6B6B]">
                        {unit.storageLocation ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#121826]">
                        <span
                          className={
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                            (unit.status === "AVAILABLE"
                              ? "border border-[#BBF7D0]/80 bg-[#F0FDF4] text-[#166534]"
                              : unit.status === "IN_USE"
                                ? "border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]"
                                : unit.status === "RESERVED"
                                  ? "border border-[#FDE68A]/80 bg-[#FEF7E6] text-[#8D6500]"
                                  : "border border-[#FECACA]/80 bg-[#FEF2F2] text-[#991B1B]")
                          }
                        >
                          {unit.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#212121]">
                        {unit.condition.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#6B6B6B]">
                        {unit.notes ?? "-"}
                        {!unit.active ? " · nonaktif" : ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {unit.status !== "AVAILABLE" && (
                            <UnitStatusAction
                              unit={{
                                id: unit.unitId,
                                code: unit.code,
                                label: unit.label,
                                status: unit.status,
                                condition: unit.condition,
                                notes: unit.notes,
                              }}
                              variant="quick-available"
                            />
                          )}
                          <UnitStatusAction
                            unit={{
                              id: unit.unitId,
                              code: unit.code,
                              label: unit.label,
                              status: unit.status,
                              condition: unit.condition,
                              notes: unit.notes,
                            }}
                            variant="full"
                          />
                          <DeleteConfirmButton
                            endpoint={`/api/plp/inventory/equipment/units/${unit.unitId}`}
                            title="Hapus Unit Fisik"
                            description="Apakah Anda yakin ingin menghapus unit fisik ini dari inventaris?"
                            itemName={`Unit ${unit.code} (${unit.label})`}
                            buttonVariant="icon"
                            disabled={unit.status === "IN_USE" || unit.status === "RESERVED"}
                            disabledReason="Unit sedang dipinjam atau direservasi"
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
          context={`${reservations.length} aktif`}
          title="Reservasi dan pemakaian"
        >
          {reservations.length === 0 ? (
            <EmptyState
              title="Tidak ada reservasi aktif"
              description="Reservasi yang sedang berjalan atau menunggu akan tampil di sini."
            />
          ) : (
            <ul className="space-y-2">
              {reservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="rounded-xl border border-[#EEEEEE] px-3 py-2.5"
                >
                  <p className="text-[12px] font-semibold text-[#212121]">
                    {reservation.unitCode} · {reservation.primaryUserName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                    {reservation.requestCode} · {reservation.status}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                    {formatRange(reservation.startAt, reservation.endAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
