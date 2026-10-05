"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, ExternalLink, MapPin, Package, User } from "lucide-react";
import { PrintButton } from "@/components/plp/print-button";
import { RequestStatusBadge, controlClass } from "@/components/workspace";
import type { PlpScheduleEvent } from "@/services/plp.service";

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(isoString));
}

export function DailyRunSheet({
  events,
  currentDate,
  rooms,
  currentRoom,
}: {
  events: PlpScheduleEvent[];
  currentDate: string;
  rooms: Array<{ id: string; name: string }>;
  currentRoom?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(currentDate);

  function handleDateChange(newDate: string) {
    setDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    params.set("view", "runsheet");
    router.push(`/plp/schedule?${params.toString()}`);
  }

  function handleRoomChange(newRoom: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newRoom) {
      params.set("room", newRoom);
    } else {
      params.delete("room");
    }
    params.set("view", "runsheet");
    router.push(`/plp/schedule?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Action Controls - hidden during print */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#121826]">
            <Calendar className="size-4 text-[#64748B]" aria-hidden="true" />
            <span>Pilih Tanggal:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className={controlClass + " w-auto"}
            />
          </label>

          <label className="flex items-center gap-2 text-[12px] font-medium text-[#121826]">
            <MapPin className="size-4 text-[#64748B]" aria-hidden="true" />
            <span>Pilih Ruangan:</span>
            <select
              value={currentRoom ?? ""}
              onChange={(e) => handleRoomChange(e.target.value)}
              className={controlClass + " w-auto"}
            >
              <option value="">Semua Lab</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <PrintButton
          targetId="daily-run-sheet-printable"
          filename={`daily_run_sheet_${date}.pdf`}
          orientation="portrait"
          label="Unduh Run Sheet PDF"
        />
      </div>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          aside, header, nav, .print-hidden, .pdf-hidden {
            display: none !important;
          }
          .pdf-only { display: block !important; }
          div.pdf-only.grid, .pdf-signature-block { display: grid !important; }
          #daily-run-sheet-printable {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: white !important;
            color: #121826 !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: calc(100vh - 20mm) !important;
          }
          .pdf-signature-block {
            margin-top: auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: auto;
          }
        }
      `}</style>

      {/* Printable Sheet Header */}
      <div
        id="daily-run-sheet-printable"
        className="rounded-2xl border border-[#E5E7EB] bg-white p-5 print:border-none print:p-0"
      >
        <div className="border-b border-[#E5E7EB] pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-[#121826]">
                Daily Run Sheet Operasional Laboratorium
              </h2>
              <p className="mt-1 text-[12px] text-[#475569]">
                Jadwal & persiapan alat-bahan untuk tanggal{" "}
                <strong className="text-[#121826]">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(`${date}T00:00:00+07:00`))}
                </strong>
                {currentRoom ? ` · Lab: ${rooms.find((r) => r.id === currentRoom)?.name ?? currentRoom}` : ""}
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#475569] tabular-nums">
              Total: {events.length} sesi operasional
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto size-8 text-[#94A3B8]" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-semibold text-[#121826]">
              Tidak ada agenda operasional
            </p>
            <p className="mt-0.5 text-[12px] text-[#475569]">
              Belum ada permohonan atau reservasi yang disetujui pada tanggal ini.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#E5E7EB]">
            {events.map((event) => (
              <div
                key={event.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-0.5 text-[11px] font-bold text-[#121826] tabular-nums">
                      <Clock className="size-3 text-[#64748B]" />
                      {formatTime(event.startAt)} - {formatTime(event.endAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF7E6] border border-[#FDE68A] px-2 py-0.5 text-[11px] font-semibold text-[#8D6500]">
                      <MapPin className="size-3" />
                      {event.roomName}
                    </span>
                    <RequestStatusBadge status={event.status} />
                  </div>

                  <p className="text-[13px] font-semibold text-[#121826]">
                    {event.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#475569]">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3 text-[#64748B]" />
                      {event.actorName}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[#64748B]">{event.code}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#121826]">
                      <Package className="size-3 text-[#64748B]" />
                      {event.resource}
                    </span>
                  </div>
                </div>

                <div className="print:hidden shrink-0 flex items-center gap-2">
                  {event.requestId && (
                    <Link
                      href={`/plp/requests/${event.requestId}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500]"
                    >
                      Buka Request <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Printable Official Signature Footer */}
        <div
          data-pdf-signature="true"
          className="hidden pdf-only grid grid-cols-2 print:grid gap-12 pt-8 mt-6 border-t border-[#121826] text-[11px] text-[#121826] pdf-signature-block"
        >
          <div>
            <p className="font-semibold">Operator / Petugas Harian:</p>
            <p className="text-[#64748B]">Pranata Laboratorium Pendidikan (PLP)</p>
            <div className="mt-12 border-t border-dashed border-[#121826] pt-1 font-medium">
              Nama & Tanda Tangan
            </div>
          </div>
          <div>
            <p className="font-semibold">Mengetahui / Verifikator:</p>
            <p className="text-[#64748B]">Koordinator Laboratorium</p>
            <div className="mt-12 border-t border-dashed border-[#121826] pt-1 font-medium">
              Nama & NIP / Tanda Tangan
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
