"use client";

import Link from "next/link";
import { ChevronRight, Wrench } from "lucide-react";
import { cn } from "cn";
import { SectionTitle, StatusBadge } from "@/components/reaksan-dashboard";
import { EquipmentGlyph } from "@/components/equipment-glyph";
import { equipmentBreakdown } from "@/components/schedule-data";

export type EquipmentFilterItem = {
  id: string;
  name: string;
  room: string;
  roomId: string;
  usage: string;
  status: string;
  tone: "green" | "blue" | "yellow" | "rose" | "cream";
  availableUnits: number;
  reservedUnits: number;
  inUseUnits: number;
  awaitingReturnUnits: number;
  maintenanceUnits: number;
  totalUnits: number;
  nextAvailable: string;
  imageMediaId?: string | null;
};

export function EquipmentFilterGrid({
  items,
  selectedId,
  onSelect,
  title,
  description,
  showRoom = true,
  activeRoomId,
}: {
  items: EquipmentFilterItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  title: string;
  description: string;
  showRoom?: boolean;
  activeRoomId?: string;
}) {
  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedIsElsewhere =
    selectedItem && activeRoomId && selectedItem.roomId !== activeRoomId;

  return (
    <section
      className="mt-4 dashboard-card p-5 sm:p-6"
      aria-label="Equipment availability and calendar filter"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <SectionTitle eyebrow="Equipment" title={title} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[#6B6B6B]">
            {selectedId
              ? "1 equipment selected"
              : `All ${items.length} equipment shown`}
          </span>
          {selectedId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="min-h-11 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Show all equipment
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 max-w-[720px] text-[12px] leading-5 text-[#6B6B6B]">
        {description}
      </p>
      {selectedIsElsewhere && selectedItem && (
        <p className="mt-3 rounded-xl bg-[#E9EEFC] p-3 text-[11px] leading-5 text-[#38529B]">
          {selectedItem.name} is tracked in {selectedItem.room}. This calendar
          only shows reservations for the current room, so open the{" "}
          <Link
            href={`/student/laboratory/rooms/${selectedItem.roomId}`}
            className="font-bold underline underline-offset-2"
          >
            {selectedItem.room} schedule
          </Link>{" "}
          to see its reservations.
        </p>
      )}
      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#D8D8D8] bg-[#FAFAF8] p-6 text-center">
          <Wrench className="mx-auto size-6 text-[#929292]" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold">
            No equipment tracked here yet
          </p>
          <p className="mt-1 text-[11px] text-[#6B6B6B]">
            Pick another room or browse the equipment inventory to plan with
            available assets.
          </p>
          <Link
            href="/student/equipment"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5]"
          >
            Browse equipment
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const selected = selectedId === item.id;
            const ratio =
              item.totalUnits > 0 ? item.availableUnits / item.totalUnits : 0;
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    "relative h-full rounded-2xl border p-3 transition",
                    selected
                      ? "border-[#F9B129] bg-[#FFFCF3] ring-1 ring-[#F9B129]"
                      : "border-[#EEEEEE] bg-white hover:border-[#D6C6A6]",
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(selected ? null : item.id)}
                    className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                  >
                    <span className="sr-only">
                      {selected
                        ? `Stop filtering the calendar by ${item.name}`
                        : `Filter the calendar by ${item.name}`}
                    </span>
                  </button>
                  <div className="pointer-events-none relative">
                    <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-[radial-gradient(circle_at_35%_25%,#FFFFFF_0,#D9E2F8_36%,#B5C5ED_100%)] text-[#38529B]">
                      {item.imageMediaId ? (
                        <img
                          src={`/api/media/${item.imageMediaId}`}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-x-8 bottom-3 h-2.5 rounded-full bg-black/10 blur-sm" />
                          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-white/75 shadow-[0_10px_18px_rgba(33,33,33,0.12)]">
                            <EquipmentGlyph
                              name={item.name}
                              className="size-6"
                              strokeWidth={1.6}
                            />
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px] text-[#212121]">
                          {item.name}
                        </strong>
                        <small className="mt-0.5 block truncate text-[10px] text-[#929292]">
                          {item.id}
                          {showRoom ? ` · ${item.room}` : ""}
                        </small>
                      </span>
                      <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                    </div>
                    <p className="mt-2 text-[11px] text-[#6B6B6B]">
                      {item.usage}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tabular-nums text-[#212121]">
                        {item.availableUnits}/{item.totalUnits} units free
                      </span>
                      <span className="text-[10px] text-[#929292]">
                        Next open · {item.nextAvailable}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#6B6B6B]">
                      {equipmentBreakdown(item)}
                    </p>
                    <span
                      className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#EEEEEE]"
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          ratio > 0.4
                            ? "bg-[#048444]"
                            : ratio > 0
                              ? "bg-[#F7B742]"
                              : "bg-[#F45959]",
                        )}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </span>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F1F1F1] pt-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          selected ? "text-[#AE7C1D]" : "text-[#929292]",
                        )}
                      >
                        {selected
                          ? "Filtering the calendar"
                          : "Select to filter the calendar"}
                      </span>
                      <Link
                        href={`/student/laboratory/equipment/${item.id}`}
                        className="pointer-events-auto relative inline-flex min-h-11 items-center text-[11px] font-bold text-[#38529B] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                      >
                        View availability
                        <ChevronRight
                          className="ml-1 size-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
