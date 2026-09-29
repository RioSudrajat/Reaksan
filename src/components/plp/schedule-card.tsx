"use client";

import Link from "next/link";
import { ArrowRight, PackageCheck, Undo2 } from "lucide-react";
import { ScheduleEventCard } from "@/components/schedule-calendar";
import type { RequestStatus, ScheduleEvent } from "@/components/schedule-data";

// Operational context for a schedule block: who booked it, what it uses, and
// which PLP action follows next, using the unified ScheduleEventCard.
export function PlpScheduleCard({
  event,
  rangeLabel,
}: {
  event: ScheduleEvent;
  rangeLabel: string;
}) {
  const status = event.status as RequestStatus;
  const queue =
    status === "APPROVED" || status === "READY_FOR_PICKUP"
      ? { href: "/plp/fulfillment/issue", label: "Issue queue", icon: PackageCheck }
      : status === "ACTIVE" || status === "OVERDUE" || status === "RETURNED"
        ? { href: "/plp/fulfillment/return", label: "Return & inspeksi", icon: Undo2 }
        : null;

  return (
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
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#F9B129] px-3.5 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Buka request
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
          {queue && (
            <Link
              href={queue.href}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3.5 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              <queue.icon className="size-3.5" aria-hidden="true" />
              {queue.label}
            </Link>
          )}
        </>
      }
    />
  );
}
