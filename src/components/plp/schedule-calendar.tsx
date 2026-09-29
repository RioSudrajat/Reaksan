"use client";

import type { ReactNode } from "react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { PlpScheduleCard } from "@/components/plp/schedule-card";
import type { ScheduleEvent } from "@/components/schedule-data";

// Shared month calendar for the PLP and admin schedule pages. It reuses the
// student calendar component so every workspace reads one visual language.
export function PlpScheduleCalendar({
  events,
  month,
  toolbar,
}: {
  events: ScheduleEvent[];
  month: { year: number; month: number };
  toolbar?: ReactNode;
}) {
  return (
    <ScheduleCalendar
      events={events}
      eventsMonth={month}
      ariaLabel="Global lab schedule"
      selectable={false}
      emptyLabel="Tidak ada jadwal pada bulan ini. Ubah filter room atau geser ke bulan lain."
      toolbar={toolbar}
      renderCard={(context) => {
        if (context.source !== "event") return null;
        const event = context.events.find((item) => item.id === context.eventId);
        if (!event) return null;
        return (
          <PlpScheduleCard
            key={`${event.id}-${context.selectionId}`}
            event={event}
            rangeLabel={context.label}
          />
        );
      }}
    />
  );
}
