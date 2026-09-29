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
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEEEEE] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#212121]">
            <Calendar className="size-4 text-[#929292]" aria-hidden="true" />
            <span>Pilih Tanggal:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className={controlClass + " w-auto"}
            />
          </label>

          <label className="flex items-center gap-2 text-[12px] font-medium text-[#212121]">
            <MapPin className="size-4 text-[#929292]" aria-hidden="true" />
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

        <PrintButton />
      </div>

      {/* Printable Sheet Header */}
      <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 print:border-none print:p-0">
        <div className="border-b border-[#EEEEEE] pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-[#212121]">
                Daily Run Sheet Operasional Laboratorium
              </h2>
              <p className="mt-1 text-[12px] text-[#6B6B6B]">
                Jadwal & persiapan alat-bahan untuk tanggal{" "}
                <strong className="text-[#212121]">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(`${date}T00:00:00+07:00`))}
                </strong>
                {currentRoom ? ` · Lab: ${rooms.find((r) => r.id === currentRoom)?.name ?? currentRoom}` : ""}
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#6B6B6B] tabular-nums">
              Total: {events.length} sesi operasional
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto size-8 text-[#B7B7B7]" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-semibold text-[#212121]">
              Tidak ada agenda operasional
            </p>
            <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
              Belum ada permohonan atau reservasi yang disetujui pada tanggal ini.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#EEEEEE]">
            {events.map((event) => (
              <div
                key={event.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#FAFAFA] border border-[#EEEEEE] px-2 py-0.5 text-[11px] font-bold text-[#212121] tabular-nums">
                      <Clock className="size-3 text-[#929292]" />
                      {formatTime(event.startAt)} - {formatTime(event.endAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#E9EEFC] px-2 py-0.5 text-[11px] font-semibold text-[#38529B]">
                      <MapPin className="size-3" />
                      {event.roomName}
                    </span>
                    <RequestStatusBadge status={event.status} />
                  </div>

                  <p className="text-[13px] font-semibold text-[#212121]">
                    {event.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B6B6B]">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3 text-[#929292]" />
                      {event.actorName}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[#929292]">{event.code}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#212121]">
                      <Package className="size-3 text-[#929292]" />
                      {event.resource}
                    </span>
                  </div>
                </div>

                <div className="print:hidden shrink-0 flex items-center gap-2">
                  {event.requestId && (
                    <Link
                      href={`/plp/requests/${event.requestId}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-3 text-[11px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5]"
                    >
                      Buka Request <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
