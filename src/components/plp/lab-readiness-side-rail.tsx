import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Wrench,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { UnitStatusAction } from "@/components/plp/unit-status-action";
import { formatRange } from "@/components/workspace";
import type { PlpMaterialRow } from "@/services/plp.service";
import type { ReservationDto } from "@/services/requests.service";

export type TriageMaintenanceUnit = {
  id: string;
  code: string;
  label: string;
  status: string;
  condition: string;
  notes?: string | null;
  assetName: string;
  assetCode: string;
};

export function LabReadinessSideRail({
  maintenanceUnits,
  lowStockMaterials,
  upcomingReservations,
  singleRoomCode,
}: {
  maintenanceUnits: TriageMaintenanceUnit[];
  lowStockMaterials: PlpMaterialRow[];
  upcomingReservations: ReservationDto[];
  singleRoomCode?: string;
}) {
  return (
    <div className="space-y-4">
      {/* 1. Panel Kesiapan Fasilitas & Stok Kritis */}
      <div className="rounded-2xl border border-[#E1E1E1] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E1E1]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30">
              <Wrench className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-[#212121]">
                Kesiapan Fasilitas & Stok
              </h2>
              <p className="text-[11px] text-[#6B6B6B]">
                {maintenanceUnits.length} alat servis · {lowStockMaterials.length} bahan menipis
              </p>
            </div>
          </div>
          <Link
            href={`/plp/inventory/equipment?status=MAINTENANCE${singleRoomCode ? `&room=${encodeURIComponent(singleRoomCode)}` : ""}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#212121] hover:text-[#AE7C1D] hover:underline"
          >
            <span>Semua</span>
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Section A: Unit Perlu Servis */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#6B6B6B]">
              Unit Perlu Servis / Kalibrasi
            </span>
            {maintenanceUnits.length > 0 && (
              <span className="text-[10px] font-bold text-[#F45959] bg-[#FDE9E9] px-2 py-0.5 rounded-full border border-[#F45959]/20 tabular-nums">
                {maintenanceUnits.length} unit
              </span>
            )}
          </div>

          {maintenanceUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-3 text-center bg-[#F5F5F5]/50">
              <CheckCircle2 className="mx-auto size-4 text-[#048444]" />
              <p className="mt-1 text-[11px] font-semibold text-[#212121]">
                Semua Unit Siap Operasional
              </p>
              <p className="text-[10px] text-[#6B6B6B]">
                Tidak ada instrumen dalam antrean perbaikan.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {maintenanceUnits.slice(0, 2).map((unit) => (
                <li
                  key={unit.id}
                  className="rounded-xl border border-[#E1E1E1] bg-[#F5F5F5]/60 p-2.5 hover:bg-white hover:border-[#F9B129]/60 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#6B6B6B] bg-white px-1.5 py-0.5 rounded border border-[#E1E1E1]">
                          {unit.code}
                        </span>
                        <span className="text-[10px] font-semibold text-[#F45959]">
                          ({unit.condition})
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] font-semibold text-[#212121] truncate">
                        {unit.assetName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#E1E1E1] flex items-center justify-between">
                    <span className="text-[10px] text-[#6B6B6B] truncate max-w-[140px]">
                      {unit.notes || "Menunggu verifikasi PLP"}
                    </span>
                    <UnitStatusAction
                      unit={{
                        id: unit.id,
                        code: unit.code,
                        label: unit.label,
                        status: unit.status,
                        condition: unit.condition,
                        notes: unit.notes,
                      }}
                      variant="quick-available"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section B: Bahan Menipis */}
        <div className="mt-4 pt-3 border-t border-[#E1E1E1]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#6B6B6B]">
              Stok Bahan Mendekati Minimum
            </span>
            <Link
              href={`/plp/inventory/materials?stock=low${singleRoomCode ? `&room=${encodeURIComponent(singleRoomCode)}` : ""}`}
              className="text-[10px] font-semibold text-[#AE7C1D] hover:underline"
            >
              Katalog Bahan &rarr;
            </Link>
          </div>

          {lowStockMaterials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-3 text-center bg-[#F5F5F5]/50">
              <CheckCircle2 className="mx-auto size-4 text-[#048444]" />
              <p className="mt-1 text-[11px] font-semibold text-[#212121]">
                Stok Reagen Aman
              </p>
              <p className="text-[10px] text-[#6B6B6B]">
                Semua bahan memenuhi ambang batas cadangan.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {lowStockMaterials.slice(0, 2).map((mat) => (
                <li
                  key={mat.materialId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#F9B129]/30 bg-[#FEF1CC]/40 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#212121]">
                      {mat.name}
                    </p>
                    <p className="text-[10px] text-[#6B6B6B]">
                      Tersedia: <strong className="text-[#212121]">{mat.available} {mat.unit}</strong>
                      {mat.minimum !== null && ` · Min: ${mat.minimum} ${mat.unit}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold ${
                      mat.outOfStock
                        ? "bg-[#F45959] text-white"
                        : "bg-[#AE7C1D] text-white"
                    }`}
                  >
                    {mat.outOfStock ? "HABIS" : "MENIPIS"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 2. Panel Agenda Praktikum & Riset (48 Jam Kedepan) */}
      <div className="rounded-2xl border border-[#E1E1E1] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E1E1]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#212121] border border-[#E1E1E1]">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-[#212121]">
                Agenda Laboratorium
              </h2>
              <p className="text-[11px] text-[#6B6B6B]">
                Jadwal praktikum & riset 48 jam ke depan
              </p>
            </div>
          </div>
          <Link
            href="/plp/schedule"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#212121] hover:text-[#AE7C1D] hover:underline"
          >
            <span>Kalender</span>
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-3.5">
          {upcomingReservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-4 text-center bg-[#F5F5F5]/50">
              <Clock className="mx-auto size-4 text-[#929292]" />
              <p className="mt-1 text-[12px] font-semibold text-[#212121]">
                Belum Ada Reservasi
              </p>
              <p className="text-[11px] text-[#6B6B6B]">
                Tidak ada peminjaman alat terkonfirmasi dalam 48 jam ke depan.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcomingReservations.slice(0, 3).map((res) => (
                <li
                  key={res.id}
                  className="rounded-xl border border-[#E1E1E1] p-2.5 hover:bg-[#F5F5F5] transition"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#212121] bg-[#F5F5F5] px-1.5 py-0.5 rounded border border-[#E1E1E1]">
                      {res.unitCode}
                    </span>
                    <span className="text-[10px] font-medium text-[#AE7C1D] bg-[#FEF1CC] px-2 py-0.5 rounded border border-[#F9B129]/30 tabular-nums">
                      {formatRange(res.startAt, res.endAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-[#212121] truncate">
                    {res.primaryUserName}
                  </p>
                  <p className="text-[11px] text-[#6B6B6B] truncate">
                    {res.roomName} {res.purpose ? `· ${res.purpose}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
