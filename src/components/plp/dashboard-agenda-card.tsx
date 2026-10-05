import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { formatRange } from "@/components/workspace";
import type { ReservationDto } from "@/services/requests.service";

export function DashboardAgendaCard({
  upcomingReservations,
}: {
  upcomingReservations: ReservationDto[];
}) {
  return (
    <div className="rounded-2xl border border-[#E1E1E1] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E1E1]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-[#212121]">
                Agenda Laboratorium
              </h2>
              <p className="text-[11px] text-[#6B6B6B]">
                Jadwal praktikum dan riset 48 jam ke depan
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
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-4 text-center bg-[#F5F5F5]/40">
              <Clock className="mx-auto size-4 text-[#929292]" />
              <p className="mt-1 text-[12px] font-semibold text-[#212121]">
                Belum Ada Reservasi Terjadwal
              </p>
              <p className="text-[11px] text-[#6B6B6B]">
                Tidak ada peminjaman alat terkonfirmasi dalam 48 jam ke depan.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcomingReservations.slice(0, 4).map((res) => (
                <li
                  key={res.id}
                  className="rounded-xl border border-[#E1E1E1] p-2.5 hover:bg-[#F5F5F5] transition"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#212121] bg-[#F5F5F5] px-1.5 py-0.5 rounded border border-[#E1E1E1]">
                      {res.unitCode}
                    </span>
                    <span className="text-[10px] font-semibold text-[#AE7C1D] bg-[#FEF1CC] px-2 py-0.5 rounded border border-[#F9B129]/30 tabular-nums">
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

      <div className="mt-4 pt-3 border-t border-[#E1E1E1] text-[11px] text-[#6B6B6B] flex items-center justify-between">
        <span>Menampilkan jadwal terkonfirmasi</span>
        <Link
          href="/plp/schedule?view=runsheet"
          className="font-semibold text-[#AE7C1D] hover:underline"
        >
          Lihat Run Sheet Hari Ini &rarr;
        </Link>
      </div>
    </div>
  );
}
