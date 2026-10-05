"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  PackageCheck,
  Undo2,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "cn";
import { ScheduleEventCard, type ScheduleCardContext } from "@/components/schedule-calendar";
import { StatusBadge } from "@/components/status-badge";
import type { RequestStatus, ScheduleEvent } from "@/components/schedule-data";
import { requestStatusLabels } from "@/components/schedule-data";

function statusToTone(status: RequestStatus): "yellow" | "green" | "neutral" | "rose" | "dark" {
  switch (status) {
    case "APPROVED":
    case "CONFIRMED":
      return "green";
    case "ACTIVE":
    case "READY_FOR_PICKUP":
      return "yellow";
    case "OVERDUE":
    case "REJECTED":
      return "rose";
    case "COMPLETED":
    case "RETURNED":
      return "neutral";
    default:
      return "dark";
  }
}

// Operational context for a schedule block: who booked it, what it uses, and
// which PLP action follows next, using the unified ScheduleEventCard.
export function PlpScheduleCard({
  event,
  rangeLabel,
  onBack,
}: {
  event: ScheduleEvent;
  rangeLabel: string;
  onBack?: () => void;
}) {
  const status = event.status as RequestStatus;
  const queue =
    status === "APPROVED" || status === "READY_FOR_PICKUP"
      ? { href: "/plp/fulfillment/issue", label: "Issue queue", icon: PackageCheck }
      : status === "ACTIVE" || status === "OVERDUE" || status === "RETURNED"
        ? { href: "/plp/fulfillment/return", label: "Return & inspeksi", icon: Undo2 }
        : null;

  return (
    <div className="space-y-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6B6B] hover:text-[#212121] transition cursor-pointer"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Kembali ke daftar permohonan tanggal ini</span>
        </button>
      )}

      <ScheduleEventCard
        event={event}
        rangeLabel={rangeLabel}
        roomName={event.roomName}
        showTimeline={event.kind === "request"}
        actions={
          <>
            {event.requestId && (
              <Link
                href={`/plp/requests/${event.requestId}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#F9B129] px-3.5 text-[12px] font-bold text-[#212121] shadow-2xs transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-[#6E8EDA]"
              >
                Buka request
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
            {queue && (
              <Link
                href={queue.href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3.5 text-[12px] font-semibold text-[#212121] transition hover:bg-[#FEF1CC] hover:border-[#F9B129] focus-visible:outline-2 focus-visible:outline-[#6E8EDA]"
              >
                <queue.icon className="size-3.5 text-[#AE7C1D]" aria-hidden="true" />
                {queue.label}
              </Link>
            )}
          </>
        }
      />
    </div>
  );
}

// Day Overview: Shows all requests scheduled on the selected day
export function PlpDayOverviewCard({
  events,
  rangeLabel,
  highlightedEventId,
  onSelectEvent,
}: {
  events: ScheduleEvent[];
  rangeLabel: string;
  highlightedEventId?: string;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  return (
    <article className="space-y-3">
      {/* Header */}
      <div className="border-b border-[#EEEEEE] pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-[#AE7C1D]" aria-hidden="true" />
          <h3 className="text-[15px] font-bold text-[#212121]">{rangeLabel}</h3>
          <span className="rounded-full bg-[#FEF1CC] px-2 py-0.5 text-[10px] font-bold text-[#AE7C1D]">
            {events.length} permohonan
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
          Daftar seluruh agenda dan permohonan yang aktif pada tanggal ini.
        </p>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-[#6B6B6B]">
          Tidak ada permohonan yang terjadwal pada tanggal ini.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {events.map((event) => {
            const tone = statusToTone(event.status);
            const equipCount = event.equipment?.length || 0;
            const primaryEquip = event.equipment?.[0];
            const isHighlighted = highlightedEventId === event.id;

            return (
              <div
                key={event.id}
                className={cn(
                  "group rounded-xl border p-3 transition hover:border-[#F9B129] hover:bg-white hover:shadow-2xs",
                  isHighlighted
                    ? "border-[#F9B129] ring-2 ring-[#F9B129]/30 bg-white"
                    : "border-[#EEEEEE] bg-[#FAFAF8]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10.5px] font-bold text-[#AE7C1D]">
                        {event.requestCode || "-"}
                      </span>
                      {event.roomName && (
                        <span className="rounded bg-[#EEEEEE] px-1.5 py-0.2 text-[9.5px] font-medium text-[#6B6B6B]">
                          {event.roomName}
                        </span>
                      )}
                      {isHighlighted && (
                        <span className="rounded bg-[#F9B129] px-1.5 py-0.2 text-[9px] font-bold text-[#212121]">
                          Dipilih di Kalender
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#212121] leading-snug">
                      {event.title}
                    </h4>
                  </div>
                  <StatusBadge tone={tone}>
                    {requestStatusLabels[event.status] || event.status}
                  </StatusBadge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                  <div className="flex items-center gap-1">
                    <User className="size-3 text-[#929292]" aria-hidden="true" />
                    <span>{event.actor}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10.5px]">
                    <Clock className="size-3 text-[#929292]" aria-hidden="true" />
                    <span>{event.time}</span>
                  </div>
                  {primaryEquip && (
                    <div className="flex items-center gap-1">
                      <Wrench className="size-3 text-[#AE7C1D]" aria-hidden="true" />
                      <span className="truncate max-w-[160px]">{primaryEquip.name}</span>
                      {equipCount > 1 && (
                        <span className="text-[10px] text-[#AE7C1D] font-medium">
                          +{equipCount - 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#EEEEEE] pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="font-semibold text-[#212121] hover:text-[#AE7C1D] transition cursor-pointer"
                  >
                    Tinjau detail operasional →
                  </button>
                  {event.requestId && (
                    <Link
                      href={`/plp/requests/${event.requestId}`}
                      className="inline-flex items-center gap-1 text-[#6B6B6B] hover:text-[#212121] transition"
                    >
                      <span>Halaman Request</span>
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

// Master Card Renderer for ScheduleCalendar
export function PlpCalendarCard({
  context,
}: {
  context: ScheduleCardContext;
}) {
  // If user clicked directly on a specific event bar, open its detail popover immediately
  const initialEvent =
    context.source === "event" && context.eventId
      ? context.events.find((item) => item.id === context.eventId) ?? context.events[0] ?? null
      : null;

  const [activeEvent, setActiveEvent] = useState<ScheduleEvent | null>(initialEvent);

  // If activeEvent is selected, show detail card with back navigation
  if (activeEvent) {
    return (
      <PlpScheduleCard
        event={activeEvent}
        rangeLabel={context.label}
        onBack={
          context.events.length > 1
            ? () => setActiveEvent(null)
            : undefined
        }
      />
    );
  }

  // Otherwise, show day overview listing all requests for that date
  return (
    <PlpDayOverviewCard
      events={context.events}
      rangeLabel={context.label}
      highlightedEventId={context.source === "event" ? context.eventId : undefined}
      onSelectEvent={(evt) => setActiveEvent(evt)}
    />
  );
}
