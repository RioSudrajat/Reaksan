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
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua equipment
      </Link>

      <PageHeader
        eyebrow={asset.assetCode}
        title={asset.name}
        description={`${asset.typeName} · ${asset.roomName} · ${
          asset.usageType === "BORROWABLE" ? "Borrowable" : "Usage only"
        }`}
        actions={
          <CatalogImage mediaId={asset.imageMediaId} alt={asset.name} size={72} />
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
                    <th scope="col" className="px-3 py-2 font-semibold">Label</th>
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
                      <td className="px-3 py-2 text-[12px] text-[#212121]">
                        {unit.label}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-[#212121]">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                            (unit.status === "AVAILABLE"
                              ? "bg-[#E5F5ED] text-[#03683A]"
                              : unit.status === "IN_USE" || unit.status === "RESERVED"
                                ? "bg-[#E9EEFC] text-[#38529B]"
                                : "bg-[#FDE9E9] text-[#9E3636]")
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
