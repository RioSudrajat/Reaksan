"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { PlpCalendarCard } from "@/components/plp/schedule-card";
import {
  ScheduleEventHistory,
  matchesScheduleEvent,
  type StatusFilterOption,
} from "@/components/plp/schedule-event-history";
import type { ScheduleEvent } from "@/components/schedule-data";

// Shared month calendar for the PLP and admin schedule pages. It reuses the
// student calendar component so every workspace reads one visual language.
export function PlpScheduleCalendar({
  events,
  month,
  toolbar,
  onMonthChange,
  emptyLabel = "Tidak ada jadwal pada bulan ini. Ubah filter room atau geser ke bulan lain.",
}: {
  events: ScheduleEvent[];
  month: { year: number; month: number };
  toolbar?: ReactNode;
  onMonthChange?: (month: { year: number; month: number }) => void;
  emptyLabel?: string;
}) {
  return (
    <ScheduleCalendar
      events={events}
      eventsMonth={month}
      ariaLabel="Global lab schedule"
      selectable={true}
      emptyLabel={emptyLabel}
      toolbar={toolbar}
      onMonthChange={onMonthChange}
      renderCard={(context) => {
        return (
          <PlpCalendarCard
            key={`${context.range.start}-${context.range.end}-${context.selectionId}`}
            context={context}
          />
        );
      }}
    />
  );
}

// Combined PLP Schedule Section that connects the interactive calendar and
// history list, synchronizing both the active month and filter states (status & search)
// reactively across both views.
export function PlpScheduleSection({
  events,
  initialMonth,
  toolbar,
  currentRoomCode,
  currentRoomName,
}: {
  events: ScheduleEvent[];
  initialMonth: { year: number; month: number };
  toolbar?: ReactNode;
  currentRoomCode?: string;
  currentRoomName?: string;
}) {
  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterOption>("ALL");

  const filteredCalendarEvents = useMemo(() => {
    return events.filter((event) =>
      matchesScheduleEvent(event, selectedStatus, search, currentRoomCode),
    );
  }, [events, selectedStatus, search, currentRoomCode]);

  const isFilterActive = selectedStatus !== "ALL" || Boolean(search.trim());

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <PlpScheduleCalendar
          events={filteredCalendarEvents}
          month={activeMonth}
          toolbar={toolbar}
          onMonthChange={setActiveMonth}
          emptyLabel={
            isFilterActive
              ? "Tidak ada jadwal yang sesuai dengan filter status atau kata kunci pencarian. Coba sesuaikan filter di bawah."
              : "Tidak ada jadwal pada bulan ini. Ubah filter room atau geser ke bulan lain."
          }
        />
      </div>
      <ScheduleEventHistory
        events={events}
        currentRoomCode={currentRoomCode}
        currentRoomName={currentRoomName}
        month={activeMonth}
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />
    </div>
  );
}
