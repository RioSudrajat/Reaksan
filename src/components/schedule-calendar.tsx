"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlignLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FlaskConical,
  GraduationCap,
  Microscope,
  Search,
  Trash2,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import {
  displayBarClasses,
  displayBadgeClasses,
  displayDotClasses,
  displayLabels,
  displayOrder,
  equipmentBreakdown,
  eventDisplayState,
  eventsForRange,
  formatRangeLabel,
  isOwnEvent,
  monthName,
  parseJakartaDate,
  requestStatusLabels,
  splitEventTime,
  type RequestEquipmentItem,
  type RequestMaterialItem,
  type RequestStatus,
  type ScheduleEvent,
} from "@/components/schedule-data";
import { useLabCatalog } from "@/components/lab-catalog-context";
import { apiRequest, errorMessage } from "@/components/student-api";
import { StatusBadge } from "@/components/reaksan-dashboard";
import { EquipmentGlyph } from "@/components/equipment-glyph";
import { CatalogImage } from "@/components/catalog-image";

// Small catalog thumbnail used inside dense lists and calendar bars.
function ResourceThumb({
  mediaId,
  alt,
  size = 24,
  className,
}: {
  mediaId?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!mediaId) return null;
  return (
    <CatalogImage
      mediaId={mediaId}
      alt={alt}
      size={size}
      className={cn("shrink-0 rounded-md", className)}
    />
  );
}

export type { ScheduleEvent };

export type DayRange = { start: number; end: number };

export type ScheduleCardContext = {
  range: DayRange;
  label: string;
  month: { year: number; month: number };
  events: ScheduleEvent[];
  source: "range" | "event" | "more";
  eventId?: string;
  selectionId: number;
  close: () => void;
};

const WEEKDAYS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

const MAX_LANES = 3;

function atMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function subscribeToNothing() {
  return () => {};
}

function readTodayKey() {
  return new Date().toDateString();
}

function readServerTodayKey() {
  return null;
}

function buildWeeks(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate();
  const leading = first.getDay();
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  const start = addDays(first, -leading);
  const cells = Array.from({ length: total }, (_, index) =>
    addDays(start, index),
  );
  const weeks: Date[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

type WeekBar = {
  event: ScheduleEvent;
  lane: number;
  startCol: number;
  endCol: number;
  openStart: boolean;
  openEnd: boolean;
};

function eventStartDate(event: ScheduleEvent, view: Date): Date {
  if (event.startAt) {
    try {
      const d = parseJakartaDate(event.startAt);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // fallback
    }
  }
  return new Date(
    view.getFullYear(),
    view.getMonth(),
    Math.min(event.startDay, event.endDay),
  );
}

function eventEndDate(event: ScheduleEvent, view: Date): Date {
  if (event.endAt) {
    try {
      const d = parseJakartaDate(event.endAt);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // fallback
    }
  }
  return new Date(
    view.getFullYear(),
    view.getMonth(),
    Math.max(event.startDay, event.endDay),
  );
}

function layoutWeek(week: Date[], events: ScheduleEvent[], view: Date) {
  const weekStart = week[0];
  const weekEnd = week[6];
  const items = events
    .map((event) => ({
      event,
      start: eventStartDate(event, view),
      end: eventEndDate(event, view),
    }))
    .filter((item) => item.start <= weekEnd && item.end >= weekStart)
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        b.end.getTime() -
          b.start.getTime() -
          (a.end.getTime() - a.start.getTime()),
    );

  const laneEnds: Date[] = [];
  const bars: WeekBar[] = [];
  for (const item of items) {
    const segmentStart = item.start < weekStart ? weekStart : item.start;
    const segmentEnd = item.end > weekEnd ? weekEnd : item.end;
    let lane = laneEnds.findIndex((end) => end < segmentStart);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(segmentEnd);
    } else {
      laneEnds[lane] = segmentEnd;
    }
    bars.push({
      event: item.event,
      lane,
      startCol: Math.round(
        (segmentStart.getTime() - weekStart.getTime()) / 86400000,
      ),
      endCol: Math.round(
        (segmentEnd.getTime() - weekStart.getTime()) / 86400000,
      ),
      openStart: item.start < weekStart,
      openEnd: item.end > weekEnd,
    });
  }
  return { bars, laneCount: laneEnds.length };
}

function CalendarGrid({
  view,
  selection,
  todayKey,
  onCellPointerDown,
  onCellPointerEnter,
  onCellKeyDown,
  renderCell,
  renderWeekOverlay,
  rootRef,
}: {
  view: Date;
  selection: { start: Date; end: Date } | null;
  todayKey: string | null;
  onCellPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    date: Date,
    el: HTMLDivElement,
    inMonth: boolean,
  ) => void;
  onCellPointerEnter?: (date: Date, inMonth: boolean) => void;
  onCellKeyDown?: (
    event: ReactKeyboardEvent<HTMLDivElement>,
    date: Date,
    el: HTMLDivElement,
    inMonth: boolean,
  ) => void;
  renderCell?: (context: {
    date: Date;
    inMonth: boolean;
    row: number;
    col: number;
  }) => ReactNode;
  renderWeekOverlay?: (context: {
    row: number;
    week: Date[];
  }) => ReactNode;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const weeks = useMemo(() => buildWeeks(view), [view]);
  const rangeStart = selection
    ? selection.start <= selection.end
      ? selection.start
      : selection.end
    : null;
  const rangeEnd = selection
    ? selection.start <= selection.end
      ? selection.end
      : selection.start
    : null;

  return (
    <div ref={rootRef} className="overflow-x-auto overscroll-x-contain">
      <div>
        <div className="grid grid-cols-7 border-b border-[#E1E1E1] bg-[#FAFAF8]">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="border-r border-[#E1E1E1] px-2 py-2 text-center text-[10px] font-bold tracking-[0.08em] text-[#6B6B6B] last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>
        <div
          role="grid"
          aria-label={`${monthName(view.getMonth())} ${view.getFullYear()}`}
        >
          {weeks.map((week, row) => (
            <div key={dateKey(week[0])} className="relative border-b border-[#E1E1E1]" role="row">
              <div className="grid grid-cols-7 divide-x divide-[#E1E1E1]">
                {week.map((date, col) => {
                  const inMonth = date.getMonth() === view.getMonth();
                  const inRange =
                    Boolean(rangeStart && rangeEnd) &&
                    date >= (rangeStart as Date) &&
                    date <= (rangeEnd as Date);
                  const isToday = todayKey === date.toDateString();
                  const isEdge =
                    Boolean(rangeStart && rangeEnd) &&
                    (sameDay(date, rangeStart as Date) ||
                      sameDay(date, rangeEnd as Date));
                  return (
                    <div
                      key={dateKey(date)}
                      role="gridcell"
                      tabIndex={inMonth ? 0 : -1}
                      data-schedule-date={dateKey(date)}
                      aria-selected={inRange}
                      aria-label={`${date.getDate()} ${monthName(date.getMonth())} ${date.getFullYear()}`}
                      onPointerDown={(event) =>
                        onCellPointerDown(
                          event,
                          date,
                          event.currentTarget,
                          inMonth,
                        )
                      }
                      onPointerEnter={() => onCellPointerEnter?.(date, inMonth)}
                      onKeyDown={(event) =>
                        onCellKeyDown?.(event, date, event.currentTarget, inMonth)
                      }
                      className={cn(
                        "relative select-none p-1.5 pb-2 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#6E8EDA]",
                        "min-h-[142px] sm:min-h-[156px] flex flex-col justify-between",
                        inMonth ? "bg-white hover:bg-[#FAFAF8]" : "bg-[#FBFBFA]",
                        inRange && "bg-[#E9EEFC]",
                      )}
                    >
                      <div className="flex h-7 items-center justify-between gap-1 pointer-events-none">
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                            inMonth ? "text-[#212121]" : "text-[#B7B7B7]",
                            isToday &&
                              inMonth &&
                              !isEdge &&
                              "bg-[#F9B129] font-bold text-[#212121]",
                            isEdge && inRange && "bg-[#38529B] text-white",
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="mt-auto">
                        {renderCell?.({ date, inMonth, row, col })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {renderWeekOverlay?.({ row, week })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScheduleCalendar({
  events,
  eventsMonth,
  toolbar,
  footer,
  emptyLabel = "No schedule blocks match this filter.",
  renderCard,
  className,
  ariaLabel = "Monthly schedule",
  selectable = true,
  onMonthChange,
}: {
  events: ScheduleEvent[];
  eventsMonth: { year: number; month: number };
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyLabel?: string;
  renderCard?: (context: ScheduleCardContext) => ReactNode;
  className?: string;
  ariaLabel?: string;
  selectable?: boolean;
  onMonthChange?: (month: { year: number; month: number }) => void;
}) {
  const [viewState, setViewState] = useState<{
    propYear: number;
    propMonth: number;
    currentView: Date;
  }>({
    propYear: eventsMonth.year,
    propMonth: eventsMonth.month,
    currentView: new Date(eventsMonth.year, eventsMonth.month, 1),
  });

  const view = useMemo(() => {
    return viewState.propYear === eventsMonth.year &&
      viewState.propMonth === eventsMonth.month
      ? viewState.currentView
      : new Date(eventsMonth.year, eventsMonth.month, 1);
  }, [viewState, eventsMonth.year, eventsMonth.month]);

  const setView = useCallback(
    (nextDate: Date) => {
      setViewState({
        propYear: eventsMonth.year,
        propMonth: eventsMonth.month,
        currentView: nextDate,
      });
    },
    [eventsMonth.year, eventsMonth.month],
  );
  const [selection, setSelection] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [card, setCard] = useState<{
    range: DayRange;
    source: "range" | "event" | "more";
    eventId?: string;
    selectionId: number;
    month?: { year: number; month: number };
  } | null>(null);
  const [cardPosition, setCardPosition] = useState<{
    left: number;
    top: number;
    width: number;
    anchorTop: number;
  } | null>(null);
  const todayKey = useSyncExternalStore(
    subscribeToNothing,
    readTodayKey,
    readServerTodayKey,
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const selectionCounterRef = useRef(0);
  const dragRef = useRef<{
    start: Date;
    end: Date;
    lastEl: HTMLElement;
    active: boolean;
  } | null>(null);

  // Events that overlap with the currently displayed month calendar grid
  const visibleEvents = useMemo(() => {
    const weeks = buildWeeks(view);
    const gridStart = weeks[0][0];
    const lastCell = weeks[weeks.length - 1][6];
    const gridEnd = new Date(
      lastCell.getFullYear(),
      lastCell.getMonth(),
      lastCell.getDate(),
      23,
      59,
      59,
      999,
    );
    return events.filter((event) => {
      const s = eventStartDate(event, view);
      const e = eventEndDate(event, view);
      const eEnd = new Date(
        e.getFullYear(),
        e.getMonth(),
        e.getDate(),
        23,
        59,
        59,
        999,
      );
      return s <= gridEnd && eEnd >= gridStart;
    });
  }, [events, view]);

  const weekLayouts = useMemo(
    () =>
      buildWeeks(view).map((week) => ({
        week,
        ...layoutWeek(week, visibleEvents, view),
      })),
    [view, visibleEvents],
  );

  const closeCard = useCallback(() => {
    setCard(null);
    setCardPosition(null);
    setSelectedEventId(null);
  }, []);

  const positionCard = useCallback((anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(380, window.innerWidth - margin * 2);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, margin),
      window.innerWidth - width - margin,
    );
    setCardPosition({
      left,
      top: rect.bottom + 8,
      width,
      anchorTop: rect.top,
    });
  }, []);

  const openCard = useCallback(
    (
      range: DayRange,
      anchor: HTMLElement,
      source: "range" | "event" | "more",
      eventId?: string,
      month?: { year: number; month: number },
    ) => {
      selectionCounterRef.current += 1;
      anchorElRef.current = anchor;
      positionCard(anchor);
      setCard({
        range,
        source,
        eventId,
        selectionId: selectionCounterRef.current,
        month,
      });
    },
    [positionCard],
  );

  useLayoutEffect(() => {
    if (!card || !cardRef.current) return;
    const el = cardRef.current;
    const observer = new ResizeObserver(() => {
      const next = { width: el.offsetWidth, height: el.offsetHeight };
      setCardSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [card]);

  useEffect(() => {
    if (!card || !anchorElRef.current) return;
    const anchor = anchorElRef.current;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => positionCard(anchor));
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [card, positionCard]);

  useEffect(() => {
    if (!card) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCard();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (anchorElRef.current?.contains(target)) return;
      closeCard();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [card, closeCard]);

  useEffect(() => {
    const finish = () => {
      const drag = dragRef.current;
      if (!drag?.active) return;
      dragRef.current = null;
      const start = drag.start <= drag.end ? drag.start : drag.end;
      const end = drag.start <= drag.end ? drag.end : drag.start;
      setSelection({ start, end });
      openCard(
        { start: start.getDate(), end: end.getDate() },
        drag.lastEl,
        "range",
      );
    };
    const cancel = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [openCard]);

  const cardStyle = useMemo(() => {
    if (!cardPosition) return undefined;
    const margin = 8;
    const height = cardSize.height;
    let top = cardPosition.top;
    if (height > 0 && top + height > window.innerHeight - margin) {
      const above = cardPosition.anchorTop - height - margin;
      top = above > margin ? above : Math.max(margin, top - height - 16);
    }
    return { left: cardPosition.left, top, width: cardPosition.width };
  }, [cardPosition, cardSize.height]);

  const handleCellPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      date: Date,
      el: HTMLDivElement,
      inMonth: boolean,
    ) => {
      if (!inMonth) {
        if (event.pointerType !== "touch") {
          setView(new Date(date.getFullYear(), date.getMonth(), 1));
          setSelection(null);
          closeCard();
        }
        return;
      }
      if (!selectable) return;
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-schedule-bar]")) return;
      const normalized = atMidnight(date);
      if (event.pointerType !== "touch") event.preventDefault();
      dragRef.current = {
        start: normalized,
        end: normalized,
        lastEl: el,
        active: true,
      };
      setSelection({ start: normalized, end: normalized });
      if (event.pointerType !== "touch") {
        setCard(null);
        setSelectedEventId(null);
      }
    },
    [closeCard, selectable, setView],
  );

  const handleCellPointerEnter = useCallback((date: Date, inMonth: boolean) => {
    const drag = dragRef.current;
    if (!drag?.active || !inMonth) return;
    setSelection({ start: drag.start, end: atMidnight(date) });
    drag.end = atMidnight(date);
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-schedule-date="${dateKey(date)}"]`,
    );
    if (el) drag.lastEl = el;
  }, []);

  const handleCellKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLDivElement>,
      date: Date,
      el: HTMLDivElement,
      inMonth: boolean,
    ) => {
      if (!inMonth) return;
      if ((event.key === "Enter" || event.key === " ") && selectable) {
        event.preventDefault();
        const normalized = atMidnight(date);
        setSelection({ start: normalized, end: normalized });
        setSelectedEventId(null);
        openCard({ start: date.getDate(), end: date.getDate() }, el, "range");
        return;
      }
      const offsets: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
      const offset = offsets[event.key];
      if (offset === undefined) return;
      event.preventDefault();
      const next = addDays(date, offset);
      const target = rootRef.current?.querySelector<HTMLElement>(
        `[data-schedule-date="${dateKey(next)}"]`,
      );
      if (target) {
        target.focus();
      } else {
        setView(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    },
    [openCard, selectable, setView],
  );

  const handleBarSelect = useCallback(
    (event: ScheduleEvent, el: HTMLElement) => {
      const s = eventStartDate(event, view);
      const e = eventEndDate(event, view);
      const sMidnight = atMidnight(s);
      const eMidnight = atMidnight(e);
      setSelection({
        start: sMidnight,
        end: eMidnight,
      });
      setSelectedEventId(event.id);
      openCard(
        { start: s.getDate(), end: e.getDate() },
        el,
        "event",
        event.id,
        { year: s.getFullYear(), month: s.getMonth() },
      );
    },
    [openCard, view],
  );

  const targetMonth = card?.month ?? {
    year: view.getFullYear(),
    month: view.getMonth(),
  };

  const cardEvents = useMemo(() => {
    if (!card) return [];
    const matched = eventsForRange(visibleEvents, card.range, targetMonth);
    if (card.source === "event" && card.eventId) {
      if (!matched.some((e) => e.id === card.eventId)) {
        const found = visibleEvents.find((e) => e.id === card.eventId);
        if (found) {
          return [found, ...matched];
        }
      }
    }
    return matched;
  }, [card, visibleEvents, targetMonth]);

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[#E1E1E1] bg-white",
        className,
      )}
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E1E1] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
            {ariaLabel}
          </p>
          <h3 className="mt-1 text-[17px] font-bold text-[#212121] tabular-nums">
            {monthName(view.getMonth())} {view.getFullYear()}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const target = todayKey ? new Date(todayKey) : new Date();
              const nextMonth = { year: target.getFullYear(), month: target.getMonth() };
              setView(new Date(nextMonth.year, nextMonth.month, 1));
              onMonthChange?.(nextMonth);
              closeCard();
            }}
            className="flex h-10 items-center rounded-lg border border-[#E1E1E1] px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const nextDate = new Date(view.getFullYear(), view.getMonth() - 1, 1);
              setView(nextDate);
              onMonthChange?.({ year: nextDate.getFullYear(), month: nextDate.getMonth() });
              closeCard();
            }}
            className="flex size-10 items-center justify-center rounded-lg border border-[#E1E1E1] text-[#6B6B6B] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              const nextDate = new Date(view.getFullYear(), view.getMonth() + 1, 1);
              setView(nextDate);
              onMonthChange?.({ year: nextDate.getFullYear(), month: nextDate.getMonth() });
              closeCard();
            }}
            className="flex size-10 items-center justify-center rounded-lg border border-[#E1E1E1] text-[#6B6B6B] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEEEEE] px-4 py-3 sm:px-5">
          {toolbar}
        </div>
      )}

      {visibleEvents.length === 0 && (
        <p className="border-b border-[#EEEEEE] bg-[#FAFAF8] px-4 py-2 text-[11px] text-[#6B6B6B] sm:px-5">
          {emptyLabel}
        </p>
      )}

      <CalendarGrid
        view={view}
        selection={selection}
        todayKey={todayKey}
        rootRef={rootRef}
        onCellPointerDown={handleCellPointerDown}
        onCellPointerEnter={handleCellPointerEnter}
        onCellKeyDown={handleCellKeyDown}
        renderWeekOverlay={({ row }) => {
          const layout = weekLayouts[row];
          if (!layout) return null;
          const visibleBars = layout.bars.filter((b) => b.lane < MAX_LANES);
          if (visibleBars.length === 0) return null;

          return (
            <div
              className="pointer-events-none absolute inset-x-0 top-[34px] grid grid-cols-7 gap-y-[3px]"
              style={{
                gridTemplateRows: `repeat(${MAX_LANES}, 22px)`,
              }}
            >
              {visibleBars.map((bar) => {
                const colStart = bar.startCol + 1;
                const colEnd = bar.endCol + 2;
                const lane = bar.lane + 1;
                const roundLeft = !bar.openStart;
                const roundRight = !bar.openEnd;

                return (
                  <button
                    type="button"
                    data-schedule-bar="true"
                    key={`${bar.event.id}-${row}-${bar.startCol}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBarSelect(bar.event, event.currentTarget);
                    }}
                    style={{
                      gridColumn: `${colStart} / ${colEnd}`,
                      gridRow: `${lane} / ${lane + 1}`,
                    }}
                    className={cn(
                      "pointer-events-auto z-10 flex h-[22px] sm:h-[20px] items-center overflow-hidden border px-2 text-left text-[9.5px] font-semibold transition cursor-pointer shadow-2xs",
                      displayBarClasses[eventDisplayState(bar.event)],
                      roundLeft ? "rounded-l-md ml-1" : "rounded-l-none ml-0 border-l-0 pl-1",
                      roundRight ? "rounded-r-md mr-1" : "rounded-r-none mr-0 border-r-0 pr-1",
                      selectedEventId === bar.event.id &&
                        "ring-2 ring-[#212121] ring-offset-1 z-20",
                    )}
                    title={`${bar.event.title}, ${eventDisplayState(bar.event)}, ${bar.event.time}`}
                  >
                    {bar.openStart && (
                      <span className="mr-1 text-[8.5px] text-[#AE7C1D] shrink-0 font-bold" aria-hidden="true">
                        ◀
                      </span>
                    )}
                    <ResourceThumb
                      mediaId={bar.event.imageMediaId}
                      alt=""
                      size={12}
                      className="mr-1 shrink-0 rounded-[2px]"
                    />
                    <span className="truncate">{bar.event.title}</span>
                    {bar.openEnd && (
                      <span className="ml-auto pl-1 text-[8.5px] text-[#AE7C1D] shrink-0 font-bold" aria-hidden="true">
                        ▶
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        }}
        renderCell={({ date, inMonth, row, col }) => {
          if (!inMonth) return null;
          const layout = weekLayouts[row];
          if (!layout) return null;
          const dayBars = layout.bars.filter(
            (bar) => bar.startCol <= col && bar.endCol >= col,
          );
          const hiddenBars = dayBars.filter((bar) => bar.lane >= MAX_LANES);
          const hiddenCount = hiddenBars.length;
          if (hiddenCount <= 0) return null;

          return (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                const day = date.getDate();
                setSelection({
                  start: atMidnight(date),
                  end: atMidnight(date),
                });
                setSelectedEventId(null);
                openCard(
                  { start: day, end: day },
                  event.currentTarget,
                  "more",
                  undefined,
                  { year: date.getFullYear(), month: date.getMonth() },
                );
              }}
              className="inline-flex items-center gap-1 rounded bg-[#FEF1CC] px-1.5 py-0.5 text-[9.5px] font-bold text-[#AE7C1D] hover:bg-[#F9B129] hover:text-[#212121] transition cursor-pointer"
              title={`Lihat seluruh ${dayBars.length} jadwal pada hari ini`}
            >
              +{hiddenCount} lainnya
            </button>
          );
        }}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-[#E1E1E1] px-4 py-3 text-[10px] font-semibold text-[#6B6B6B] sm:px-5">
        {displayOrder
          .filter((state) =>
            visibleEvents.some((event) => eventDisplayState(event) === state),
          )
          .map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  displayDotClasses[state],
                )}
                aria-hidden="true"
              />
              {displayLabels[state]}
            </span>
          ))}
        {footer ?? (
          <span className="ml-auto text-[#929292]">
            {selectable
              ? "Drag across dates to block a range, or select a block for details"
              : "Select a block to see its details"}
          </span>
        )}
      </div>

      {card && renderCard && cardStyle && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label="Schedule details"
          tabIndex={-1}
          style={cardStyle}
          className="fixed z-50 rounded-2xl border border-[#E1E1E1] bg-white p-4 shadow-[0_18px_40px_rgba(33,33,33,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
        >
          <button
            type="button"
            onClick={closeCard}
            aria-label="Close details"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="max-h-[min(70vh,540px)] overflow-y-auto pr-6">
            {renderCard({
              range: card.range,
              label: formatRangeLabel(card.range, targetMonth),
              month: targetMonth,
              events: cardEvents,
              source: card.source,
              eventId: card.eventId,
              selectionId: card.selectionId,
              close: closeCard,
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function statusSteps(event: ScheduleEvent) {
  if (event.status === "CONFIRMED")
    return [
      { label: "Shared usage disetujui", state: "done" as const },
      { label: "Terlihat di kalender semua pihak", state: "done" as const },
    ];
  const order: RequestStatus[] = [
    "PENDING_PLP",
    "APPROVED",
    "READY_FOR_PICKUP",
    "ACTIVE",
    "RETURNED",
    "COMPLETED",
  ];
  const labels = [
    "Diajukan",
    "Review PLP",
    "Disetujui",
    "Disiapkan",
    "Sedang digunakan",
    "Dikembalikan",
    "Selesai",
  ];
  if (event.status === "REJECTED" || event.status === "CANCELLED")
    return [
      { label: "Diajukan", state: "done" as const },
      { label: "Review PLP", state: "done" as const },
      {
        label: event.status === "REJECTED" ? "Ditolak" : "Dibatalkan",
        state: "stopped" as const,
      },
    ];
  const currentIndex =
    event.status === "REQUEST_REVISION" ? 1 : order.indexOf(event.status) + 1;
  return labels.map((label, index) => ({
    label,
    state:
      index < currentIndex
        ? ("done" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("todo" as const),
  }));
}

export function ScheduleEventCard({
  event,
  rangeLabel,
  roomName,
  actions,
  showTimeline = false,
}: {
  event: ScheduleEvent;
  rangeLabel: string;
  roomName?: string;
  actions?: ReactNode;
  showTimeline?: boolean;
}) {
  const display = eventDisplayState(event);
  const steps = statusSteps(event);
  return (
    <article className="rounded-xl border border-[#EEEEEE] bg-white p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            displayDotClasses[display],
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          {event.requestCode && (
            <p className="text-[10px] font-bold text-[#929292] [font-variant-numeric:tabular-nums]">
              {event.requestCode}
            </p>
          )}
          <h4 className="text-[14px] font-bold text-[#212121]">
            {event.title}
          </h4>
          <p className="mt-1 text-[11px] font-medium text-[#6B6B6B]">
            {rangeLabel} · {event.time}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
            displayBadgeClasses[display],
          )}
        >
          {requestStatusLabels[display]}
        </span>
      </div>
      <dl className="mt-3 space-y-2 border-t border-[#F1F1F1] pt-3 text-[11px]">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 font-semibold text-[#929292]">Pemohon</dt>
          <dd className="min-w-0 flex-1 text-[#212121]">{event.actor}</dd>
        </div>
        {roomName && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">Ruangan</dt>
            <dd className="min-w-0 flex-1 text-[#212121]">{roomName}</dd>
          </div>
        )}
        {event.equipment && event.equipment.filter((e) => e.classification === "INSTRUMENT").length > 0 && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#AE7C1D]">
              Instrumen
            </dt>
            <dd className="min-w-0 flex-1 space-y-1 text-[#212121]">
              {event.equipment
                .filter((item) => item.classification === "INSTRUMENT")
                .map((item) => (
                  <span key={item.unitId} className="flex items-start gap-2">
                    <ResourceThumb
                      mediaId={item.imageMediaId}
                      alt={item.name}
                      size={22}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-[#212121]">{item.name}</span>
                      <span className="text-[#929292]">
                        {" "}
                        · {item.unitLabel} · {item.unitId}
                      </span>
                    </span>
                  </span>
                ))}
            </dd>
          </div>
        )}
        {event.equipment && event.equipment.filter((e) => e.classification !== "INSTRUMENT").length > 0 && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#6B6B6B]">
              Alat
            </dt>
            <dd className="min-w-0 flex-1 space-y-1 text-[#212121]">
              {event.equipment
                .filter((item) => item.classification !== "INSTRUMENT")
                .map((item) => (
                  <span key={item.unitId} className="flex items-start gap-2">
                    <ResourceThumb
                      mediaId={item.imageMediaId}
                      alt={item.name}
                      size={22}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-[#212121]">{item.name}</span>
                      <span className="text-[#929292]">
                        {" "}
                        · {item.unitLabel} · {item.unitId}
                      </span>
                    </span>
                  </span>
                ))}
            </dd>
          </div>
        )}
        {(!event.equipment || event.equipment.length === 0) && event.resourceId ? (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              Sumber Daya
            </dt>
            <dd className="min-w-0 flex-1 text-[#212121]">
              {event.resourceId}
              {event.resourceUnit ? ` · ${event.resourceUnit}` : ""}
            </dd>
          </div>
        ) : null}
        {event.materials && event.materials.length > 0 && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              Bahan Kimia
            </dt>
            <dd className="min-w-0 flex-1 space-y-1 text-[#212121]">
              {event.materials.map((item) => (
                <span key={item.id} className="flex items-start gap-2">
                  <ResourceThumb
                    mediaId={item.imageMediaId}
                    alt={item.name}
                    size={22}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    {item.name} · {item.quantity} {item.unit}
                  </span>
                </span>
              ))}
            </dd>
          </div>
        )}
        {event.supervisor && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              Pembimbing
            </dt>
            <dd className="min-w-0 flex-1 text-[#212121]">{event.supervisor}</dd>
          </div>
        )}
        {event.fieldPic && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              PIC Lapangan
            </dt>
            <dd className="min-w-0 flex-1 text-[#212121]">{event.fieldPic}</dd>
          </div>
        )}
        {event.mode && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">Tipe</dt>
            <dd className="min-w-0 flex-1 text-[#212121]">
              {event.mode === "shared"
                ? "Pengajuan Sesi Bersama"
                : "Peminjaman Mandiri"}
            </dd>
          </div>
        )}
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 font-semibold text-[#929292]">
            Keperluan
          </dt>
          <dd className="min-w-0 flex-1 leading-5 text-[#212121]">
            {event.purpose}
          </dd>
        </div>
        {event.issuedAt && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              Diserahkan
            </dt>
            <dd className="min-w-0 flex-1 text-[#212121]">
              {new Date(event.issuedAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        )}
        {event.returnedAt && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#929292]">
              Dikembalikan
            </dt>
            <dd className="min-w-0 flex-1 text-[#212121]">
              {new Date(event.returnedAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        )}
      </dl>
      {event.status === "REQUEST_REVISION" && event.revisionNote && (
        <p className="mt-3 rounded-xl bg-[#FFF4D9] p-3 text-[11px] leading-5 text-[#705012]">
          Revisi diminta: {event.revisionNote}
        </p>
      )}
      {event.status === "REJECTED" && event.rejectionReason && (
        <p className="mt-3 rounded-xl bg-[#FDE9E9] p-3 text-[11px] leading-5 text-[#9E3636]">
          Alasan ditolak: {event.rejectionReason}
        </p>
      )}
      {showTimeline && (
        <ol className="mt-4 space-y-2 border-t border-[#F1F1F1] pt-3">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  step.state === "done" && "bg-[#048444]",
                  step.state === "current" && "bg-[#F9B129]",
                  step.state === "stopped" && "bg-[#F45959]",
                  step.state === "todo" && "bg-[#E1E1E1]",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-[11px]",
                  step.state === "todo"
                    ? "text-[#929292]"
                    : "font-semibold text-[#212121]",
                )}
              >
                {step.label}
              </span>
              {step.state === "current" && (
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#AE7C1D]">
                  sekarang
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {actions && (
        <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
      )}
    </article>
  );
}

function FormRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-1 size-4 shrink-0 text-[#6B6B6B]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#929292]">
          {label}
        </span>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-2.5 text-[12px] text-[#212121] outline-none focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20";

function PickerThumb({
  variant,
  name = "",
  mediaId,
}: {
  variant: "equipment" | "material";
  name?: string;
  mediaId?: string | null;
}) {
  if (mediaId) {
    return (
      <CatalogImage
        mediaId={mediaId}
        alt={name || (variant === "equipment" ? "Equipment" : "Material")}
        size={64}
        className="shrink-0"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/70",
        variant === "equipment"
          ? "bg-[radial-gradient(circle_at_35%_25%,#FFFFFF_0,#D9E2F8_36%,#B5C5ED_100%)] text-[#38529B]"
          : "bg-[radial-gradient(circle_at_35%_25%,#FFFFFF_0,#FDE9C8_38%,#F9D39A_100%)] text-[#A45C1B]",
      )}
    >
      <span className="absolute inset-x-3 bottom-2 h-1.5 rounded-full bg-black/10 blur-sm" />
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-white/75 shadow-[0_6px_12px_rgba(33,33,33,0.14)]">
        {variant === "equipment" ? (
          <EquipmentGlyph name={name} className="size-4" />
        ) : (
          <FlaskConical className="size-4" aria-hidden="true" />
        )}
      </span>
    </span>
  );
}

function PickerShell({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    element.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        element.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212121]/45 sm:items-center sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[88vh] w-full max-w-[620px] flex-col rounded-t-2xl bg-white shadow-[0_24px_60px_rgba(33,33,33,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] sm:rounded-2xl"
      >
        <div className="border-b border-[#EEEEEE] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-[#212121]">{title}</h3>
              <p className="mt-1 text-[11px] leading-4 text-[#6B6B6B]">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEEEEE] p-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function EquipmentPickerModal({
  roomId,
  targetClassification,
  selected,
  onChange,
  onClose,
}: {
  roomId: string;
  targetClassification?: "INSTRUMENT" | "TOOL";
  selected: RequestEquipmentItem[];
  onChange: (items: RequestEquipmentItem[]) => void;
  onClose: () => void;
}) {
  const catalog = useLabCatalog();
  const [query, setQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<"ALL" | "INSTRUMENT" | "TOOL">(targetClassification ?? "ALL");
  const effectiveFilter = targetClassification ?? classificationFilter;
  const [unitChoice, setUnitChoice] = useState<Record<string, string>>({});
  const list = catalog.equipment.filter(
    (asset) =>
      asset.roomId === roomId &&
      (effectiveFilter === "ALL" || asset.classification === effectiveFilter) &&
      `${asset.name} ${asset.id} ${asset.room}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const catalogRoom = catalog.rooms.find((room) => room.id === roomId);
  const addedUnitIds = selected.map((item) => item.unitId);
  const activeSelected = targetClassification
    ? selected.filter(
        (item) =>
          item.classification === targetClassification ||
          catalog.equipment.find((a) => a.id === item.id)?.classification ===
            targetClassification,
      )
    : selected;

  const addUnit = (assetId: string) => {
    const asset = catalog.equipment.find((item) => item.id === assetId);
    if (!asset) return;
    const units = asset.units;
    const available = units.filter(
      (unit) =>
        unit.status === "Available" && !addedUnitIds.includes(unit.id),
    );
    if (available.length === 0) return;
    const chosen =
      available.find((unit) => unit.id === unitChoice[assetId]) ??
      available[0];
    onChange([
      ...selected,
      {
        id: asset.id,
        name: asset.name,
        unitId: chosen.id,
        unitLabel: chosen.label,
        classification: asset.classification,
        imageMediaId: asset.imageMediaId,
      },
    ]);
    const next = available.find((unit) => unit.id !== chosen.id);
    setUnitChoice((current) => ({ ...current, [assetId]: next?.id ?? "" }));
  };

  const removeUnit = (unitId: string) => {
    onChange(selected.filter((item) => item.unitId !== unitId));
  };

  const modalTitle =
    targetClassification === "INSTRUMENT"
      ? "Pilih Instrumen Laboratorium"
      : targetClassification === "TOOL"
        ? "Pilih Alat Praktikum & Glassware"
        : "Choose equipment";

  const modalDesc =
    targetClassification === "INSTRUMENT"
      ? `Hanya instrumen laboratorium yang terdata di ${catalogRoom?.name ?? roomId} yang ditampilkan. Unit yang sedang digunakan atau maintenance tidak dapat dipilih.`
      : targetClassification === "TOOL"
        ? `Hanya alat dan glassware yang terdata di ${catalogRoom?.name ?? roomId} yang ditampilkan. Unit yang sedang digunakan atau maintenance tidak dapat dipilih.`
        : `Only equipment tracked in ${catalogRoom?.name ?? roomId} is listed. Units that are in use or under maintenance cannot be selected, and a unit can only be added once.`;

  return (
    <PickerShell
      title={modalTitle}
      description={modalDesc}
      onClose={onClose}
      footer={
        <>
          <span className="text-[11px] font-semibold text-[#6B6B6B]">
            {activeSelected.length} unit{activeSelected.length === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[11px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Selesai
          </button>
        </>
      }
    >
      <label className="relative block">
        <span className="sr-only">Search equipment</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            targetClassification === "INSTRUMENT"
              ? "Cari instrumen laboratorium..."
              : targetClassification === "TOOL"
                ? "Cari alat praktikum atau glassware..."
                : "Search equipment"
          }
          className="h-11 w-full rounded-xl border border-[#E1E1E1] pl-9 pr-3 text-[12px] outline-none placeholder:text-[#929292] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
        />
      </label>
      {!targetClassification && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setClassificationFilter("ALL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
              classificationFilter === "ALL"
                ? "bg-[#212121] text-white"
                : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EAEAEA]",
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setClassificationFilter("INSTRUMENT")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
              classificationFilter === "INSTRUMENT"
                ? "bg-[#F9B129] text-[#212121]"
                : "bg-[#FEF1CC] text-[#AE7C1D] hover:bg-[#F9B129]/30",
            )}
          >
            Instrumen Laboratorium
          </button>
          <button
            type="button"
            onClick={() => setClassificationFilter("TOOL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
              classificationFilter === "TOOL"
                ? "bg-[#212121] text-white"
                : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EAEAEA]",
            )}
          >
            Alat Praktikum & Glassware
          </button>
        </div>
      )}
      {list.length === 0 && (
        <p className="mt-4 rounded-xl bg-[#FAFAF8] p-4 text-center text-[11px] leading-5 text-[#6B6B6B]">
          Tidak ada instrumen yang cocok dengan filter di ruangan ini.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {list.map((asset) => {
          const units = asset.units;
          const addedForAsset = selected.filter((item) => item.id === asset.id);
          const remaining = units.filter(
            (unit) =>
              unit.status === "Available" && !addedUnitIds.includes(unit.id),
          );
          const chosenId =
            remaining.find((unit) => unit.id === unitChoice[asset.id])?.id ??
            remaining[0]?.id ??
            "";
          const disabled = remaining.length === 0;
          return (
            <li
              key={asset.id}
              className={cn(
                "rounded-2xl border p-3",
                addedForAsset.length > 0
                  ? "border-[#F9B129] bg-[#FFFCF3]"
                  : disabled
                    ? "border-[#F1F1F1] bg-[#FAFAF8]"
                    : "border-[#E1E1E1] bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                <PickerThumb
                  variant="equipment"
                  name={asset.name}
                  mediaId={asset.imageMediaId}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[13px] text-[#212121]">
                      {asset.name}
                    </strong>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        asset.classification === "INSTRUMENT"
                          ? "bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30"
                          : "bg-[#F5F5F5] text-[#6B6B6B] border border-[#E1E1E1]",
                      )}
                    >
                      {asset.classification === "INSTRUMENT" ? "Instrumen" : "Alat"}
                    </span>
                    <StatusBadge tone={asset.tone}>{asset.status}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B6B6B]">
                    {asset.room} · {asset.usage} · {equipmentBreakdown(asset)}
                  </p>
                  {addedForAsset.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {addedForAsset.map((item) => (
                        <li
                          key={item.unitId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-[10px] text-[#212121]"
                        >
                          <span>
                            {item.unitLabel} · {item.unitId}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUnit(item.unitId)}
                            aria-label={`Hapus ${item.unitId}`}
                            className="inline-flex min-h-8 items-center rounded-md px-2 font-bold text-[#9E3636] hover:bg-[#FDE9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                          >
                            Hapus
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`unit-${asset.id}`}>
                      Unit untuk {asset.name}
                    </label>
                    <select
                      id={`unit-${asset.id}`}
                      value={chosenId}
                      onChange={(event) =>
                        setUnitChoice((current) => ({
                          ...current,
                          [asset.id]: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className={cn(fieldClass, "h-10 max-w-[260px] min-w-0 flex-1")}
                    >
                      {units.map((unit) => {
                        const added = addedUnitIds.includes(unit.id);
                        const unavailable = unit.status !== "Available";
                        return (
                          <option
                            key={unit.id}
                            value={unit.id}
                            disabled={unavailable || added}
                          >
                            {unit.label} · {unit.id}
                            {unavailable
                              ? ` (${unit.status}${unit.holder ? ` · ${unit.holder}` : ""})`
                              : added
                                ? " (sudah dipilih)"
                                : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => addUnit(asset.id)}
                      disabled={disabled}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#212121] px-3 text-[11px] font-bold text-white hover:bg-[#3A3A3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:cursor-not-allowed disabled:bg-[#E1E1E1] disabled:text-[#929292]"
                    >
                      {disabled ? "Unit habis" : "Tambah unit"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PickerShell>
  );
}

function MaterialPickerModal({
  roomId,
  selected,
  onChange,
  onClose,
}: {
  roomId: string;
  selected: RequestMaterialItem[];
  onChange: (items: RequestMaterialItem[]) => void;
  onClose: () => void;
}) {
  const catalog = useLabCatalog();
  const roomMaterials = catalog.materials.filter(
    (material) => material.roomId === roomId,
  );
  const toggle = (id: string) => {
    const existing = selected.find((item) => item.id === id);
    if (existing) {
      onChange(selected.filter((item) => item.id !== id));
      return;
    }
    const material = catalog.materials.find((item) => item.id === id);
    if (!material || material.options.length === 0) return;
    onChange([
      ...selected,
      {
        id: material.id,
        name: material.name,
        quantity: material.options[0],
        unit: material.unit,
        imageMediaId: material.imageMediaId,
      },
    ]);
  };

  const setQuantity = (id: string, quantity: number) => {
    onChange(
      selected.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  return (
    <PickerShell
      title="Pilih Bahan Kimia"
      description={`Hanya bahan yang tersimpan di ${catalog.rooms.find((room) => room.id === roomId)?.name ?? roomId} yang ditampilkan. Takaran mengikuti aturan laboratorium dan bahan yang habis tidak dapat dipilih.`}
      onClose={onClose}
      footer={
        <>
          <span className="text-[11px] font-semibold text-[#6B6B6B]">
            {selected.length} bahan dipilih
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[11px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Selesai
          </button>
        </>
      }
    >
      {roomMaterials.length === 0 ? (
        <div className="rounded-xl bg-[#FAFAF8] p-5 text-center">
          <p className="text-[12px] font-semibold text-[#212121]">
            Belum ada stok bahan di lab ini
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#6B6B6B]">
            Setiap laboratorium menyimpan stok bahan tersendiri. Pilih peralatan dari lab ini atau koordinasikan dengan petugas PLP.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {roomMaterials.map((material) => {
            const selectedItem = selected.find(
              (item) => item.id === material.id,
            );
            const disabled = material.options.length === 0;
            return (
              <li
                key={material.id}
                className={cn(
                  "relative rounded-2xl border p-3",
                  selectedItem
                    ? "border-[#F9B129] bg-[#FFFCF3]"
                    : disabled
                      ? "border-[#F1F1F1] bg-[#FAFAF8]"
                      : "border-[#E1E1E1] bg-white hover:border-[#D6C6A6]",
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={Boolean(selectedItem)}
                  onClick={() => toggle(material.id)}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:cursor-not-allowed"
                >
                  <span className="sr-only">
                    {selectedItem
                      ? `Remove ${material.name} from the request`
                      : `Add ${material.name} to the request`}
                  </span>
                </button>
                <div className="pointer-events-none relative flex items-start gap-3">
                  <PickerThumb
                    variant="material"
                    name={material.name}
                    mediaId={material.imageMediaId}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[13px] text-[#212121]">
                        {material.name}
                      </strong>
                      <StatusBadge tone={material.tone}>
                        {disabled ? "Out of stock" : "Available"}
                      </StatusBadge>
                    </span>
                    <span className="mt-1 block text-[11px] text-[#6B6B6B]">
                      {material.id} · {material.category} · {material.room}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#929292]">
                      {material.available} {material.unit} tersedia ·{" "}
                      {material.physical} physical · {material.reserved} reserved
                      · {material.rule}
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          disabled
                            ? "text-[#9E3636]"
                            : selectedItem
                              ? "text-[#03683A]"
                              : "text-[#929292]",
                        )}
                      >
                        {disabled
                          ? "Cannot be added right now"
                          : selectedItem
                            ? "Added to this request"
                            : "Select this card to add it"}
                      </span>
                      {selectedItem && (
                        <div className="pointer-events-auto mt-2 flex flex-col gap-2">
                          {material.options.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-[#6B6B6B]">
                                Preset:
                              </span>
                              {material.options.slice(0, 6).map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuantity(material.id, value);
                                  }}
                                  className={cn(
                                    "rounded-lg px-2 py-0.5 text-[11px] font-semibold transition",
                                    selectedItem.quantity === value
                                      ? "bg-[#38529B] text-white shadow-xs"
                                      : "bg-[#F1F1F1] text-[#212121] hover:bg-[#E5E5E5]",
                                  )}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <label
                              className="text-[10px] font-bold uppercase text-[#929292]"
                              htmlFor={`pick-material-qty-${material.id}`}
                            >
                              Takaran
                            </label>
                            <div className="relative inline-flex items-center">
                              <input
                                id={`pick-material-qty-${material.id}`}
                                type="number"
                                min={0}
                                step="any"
                                value={selectedItem.quantity || ""}
                                onChange={(event) => {
                                  const val = parseFloat(event.target.value);
                                  setQuantity(material.id, isNaN(val) ? 0 : val);
                                }}
                                className="h-9 w-28 rounded-xl border border-[#E1E1E1] bg-white px-2.5 pr-8 text-[12px] font-semibold tabular-nums focus:border-[#38529B] focus:outline-none"
                              />
                              <span className="pointer-events-none absolute right-2.5 text-[11px] font-semibold text-[#6B6B6B]">
                                {material.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PickerShell>
  );
}

export type RequestFormDefaults = {
  title?: string;
  roomCode?: string;
  equipment?: RequestEquipmentItem[];
  materials?: RequestMaterialItem[];
  startTime?: string;
  endTime?: string;
  purpose?: string;
  supervisor?: string;
  fieldPic?: string;
};

function jakartaIso(day: number, time: string, month: { year: number; month: number }) {
  const date = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
  return `${date}T${time}:00+07:00`;
}

export function ScheduleRequestForm({
  range,
  label,
  month,
  defaults,
  editingId,
  onCancel,
}: {
  range: DayRange;
  label: string;
  month: { year: number; month: number };
  defaults?: RequestFormDefaults;
  editingId?: string;
  onCancel: () => void;
}) {
  const catalog = useLabCatalog();
  const router = useRouter();
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [roomId, setRoomId] = useState(
    defaults?.roomCode ?? catalog.rooms[0]?.id ?? "",
  );
  const [equipment, setEquipment] = useState<RequestEquipmentItem[]>(
    defaults?.equipment ?? [],
  );
  const [materials, setMaterials] = useState<RequestMaterialItem[]>(
    defaults?.materials ?? [],
  );
  const [startTime, setStartTime] = useState(defaults?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(defaults?.endTime ?? "12:00");
  const [purpose, setPurpose] = useState(defaults?.purpose ?? "");
  const [supervisor, setSupervisor] = useState(defaults?.supervisor ?? "");
  const [fieldPic, setFieldPic] = useState(defaults?.fieldPic ?? "");
  const [picker, setPicker] = useState<"instrument" | "tool" | "materials" | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instrumentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toolTriggerRef = useRef<HTMLButtonElement | null>(null);
  const materialTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editing = Boolean(editingId);

  const instruments = useMemo(
    () =>
      equipment.filter(
        (item) =>
          item.classification === "INSTRUMENT" ||
          catalog.equipment.find((asset) => asset.id === item.id)
            ?.classification === "INSTRUMENT",
      ),
    [equipment, catalog.equipment],
  );

  const tools = useMemo(
    () =>
      equipment.filter(
        (item) =>
          item.classification === "TOOL" ||
          catalog.equipment.find((asset) => asset.id === item.id)
            ?.classification !== "INSTRUMENT",
      ),
    [equipment, catalog.equipment],
  );

  const setMaterialQuantity = (id: string, quantity: number) => {
    setMaterials((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(editingId ? `/api/requests/${editingId}` : "/api/requests", {
        method: editingId ? "PATCH" : "POST",
        body: {
          title: title.trim(),
          purpose: purpose.trim(),
          roomCode: roomId,
          startAt: jakartaIso(Math.min(range.start, range.end), startTime, month),
          endAt: jakartaIso(Math.max(range.start, range.end), endTime, month),
          supervisor: supervisor.trim(),
          fieldPic: fieldPic.trim(),
          equipment: equipment.map((item) => ({
            unitCode: item.unitId,
            purpose: purpose.trim(),
          })),
          materials: materials.map((item) => ({
            materialCode: item.id,
            quantity: item.quantity,
          })),
        },
      });
      setSent(true);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#03683A]">
          Request sent
        </p>
        <h4 className="mt-1 text-[15px] font-bold text-[#212121]">
          {title.trim() || "Untitled request"}
        </h4>
        <p className="mt-1 text-[11px] font-medium text-[#6B6B6B]">
          {label} · {startTime}–{endTime}
        </p>
        <p className="mt-2 rounded-xl bg-[#F4FCF7] p-3 text-[11px] leading-5 text-[#03683A]">
          Request tersimpan di database dan menunggu review PLP. Request ini
          hanya muncul di room schedule setelah disetujui.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Close
          </button>
          <Link
            href="/student/calendar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#212121] px-3 text-[11px] font-bold text-white hover:bg-[#3A3A3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Open My calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit}>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#929292]">
          {editing ? "Edit request" : "New request"}
        </p>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add title"
          aria-label="Request title"
          className="mt-1 w-full border-b-2 border-[#38529B] bg-transparent pb-2 text-[17px] font-semibold text-[#212121] outline-none placeholder:text-[#B7B7B7] focus:border-[#F9B129]"
        />
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#FDE9E9] p-2.5 text-[11px] leading-5 text-[#9E3636]"
          >
            {error}
          </p>
        )}
        <div className="mt-4 space-y-4">
          <FormRow icon={CalendarDays} label="Tanggal">
            <p className="text-[13px] font-semibold text-[#212121]">{label}</p>
            <p className="mt-1 text-[10px] leading-4 text-[#929292]">
              Pilih rentang tanggal lain pada kalender untuk mengubah waktu.
            </p>
          </FormRow>
          <FormRow icon={Clock3} label="Waktu">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                aria-label="Waktu mulai"
                className={cn(fieldClass, "w-[108px] tabular-nums")}
              />
              <span className="text-[12px] text-[#6B6B6B]">–</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                aria-label="Waktu selesai"
                className={cn(fieldClass, "w-[108px] tabular-nums")}
              />
            </div>
          </FormRow>
          <FormRow icon={FlaskConical} label="Ruangan">
            <select
              value={roomId}
              onChange={(event) => {
                const nextRoom = event.target.value;
                setRoomId(nextRoom);
                setEquipment((current) =>
                  current.filter(
                    (item) =>
                      catalog.equipment.find((asset) => asset.id === item.id)
                        ?.roomId === nextRoom,
                  ),
                );
                setMaterials((current) =>
                  current.filter(
                    (item) =>
                      catalog.materials.find(
                        (material) => material.id === item.id,
                      )?.roomId === nextRoom,
                  ),
                );
              }}
              aria-label="Ruangan"
              className={fieldClass}
            >
              {catalog.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] leading-4 text-[#929292]">
              Daftar instrumen dan bahan kimia mengikuti ruangan terpilih.
            </p>
          </FormRow>
          <FormRow icon={GraduationCap} label="Dosen Pembimbing">
            <input
              value={supervisor}
              onChange={(event) => setSupervisor(event.target.value)}
              aria-label="Dosen Pembimbing"
              placeholder="Nama dosen pembimbing"
              className={fieldClass}
            />
            <p className="mt-0.5 text-[10px] text-[#929292]">
              Tercatat pada pengajuan dan diverifikasi oleh PLP
            </p>
          </FormRow>
          <FormRow icon={UsersRound} label="PIC Lapangan">
            <input
              value={fieldPic}
              onChange={(event) => setFieldPic(event.target.value)}
              aria-label="PIC Lapangan"
              placeholder="PIC lapangan atau PLP pendamping"
              className={fieldClass}
            />
          </FormRow>
          <FormRow icon={Microscope} label="Instrumen Laboratorium">
            <button
              ref={instrumentTriggerRef}
              type="button"
              onClick={() => setPicker("instrument")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Pilih instrumen
              {instruments.length > 0 && (
                <span className="rounded-full bg-[#FEF1CC] px-2 py-0.5 text-[10px] font-bold text-[#AE7C1D]">
                  {instruments.length}
                </span>
              )}
            </button>
            {instruments.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {instruments.map((item) => (
                  <li
                    key={item.unitId}
                    className="flex items-center gap-2 rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] px-2.5 py-2"
                  >
                    <ResourceThumb
                      mediaId={item.imageMediaId}
                      alt={item.name}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[11px] text-[#212121]">
                        {item.name}
                      </strong>
                      <span className="block text-[10px] text-[#929292]">
                        {item.unitLabel} · {item.unitId}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEquipment((current) =>
                          current.filter(
                            (entry) => entry.unitId !== item.unitId,
                          ),
                        )
                      }
                      aria-label={`Hapus ${item.unitId}`}
                      className="flex size-10 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#EEEEEE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormRow>
          <FormRow icon={Wrench} label="Alat Praktikum & Glassware">
            <button
              ref={toolTriggerRef}
              type="button"
              onClick={() => setPicker("tool")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Pilih alat
              {tools.length > 0 && (
                <span className="rounded-full bg-[#E9EEFC] px-2 py-0.5 text-[10px] font-bold text-[#38529B]">
                  {tools.length}
                </span>
              )}
            </button>
            {tools.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {tools.map((item) => (
                  <li
                    key={item.unitId}
                    className="flex items-center gap-2 rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] px-2.5 py-2"
                  >
                    <ResourceThumb
                      mediaId={item.imageMediaId}
                      alt={item.name}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[11px] text-[#212121]">
                        {item.name}
                      </strong>
                      <span className="block text-[10px] text-[#929292]">
                        {item.unitLabel} · {item.unitId}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEquipment((current) =>
                          current.filter(
                            (entry) => entry.unitId !== item.unitId,
                          ),
                        )
                      }
                      aria-label={`Hapus ${item.unitId}`}
                      className="flex size-10 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#EEEEEE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormRow>
          <FormRow icon={AlignLeft} label="Bahan Kimia">
            <button
              ref={materialTriggerRef}
              type="button"
              onClick={() => setPicker("materials")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            >
              Pilih bahan
              {materials.length > 0 && (
                <span className="rounded-full bg-[#E9EEFC] px-2 py-0.5 text-[10px] font-bold text-[#38529B]">
                  {materials.length}
                </span>
              )}
            </button>
            {materials.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {materials.map((item) => {
                  const option = catalog.materials.find(
                    (entry) => entry.id === item.id,
                  );
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-[#EEEEEE] bg-[#FAFAF8] px-2.5 py-2"
                    >
                      <ResourceThumb
                        mediaId={item.imageMediaId ?? option?.imageMediaId}
                        alt={item.name}
                        size={28}
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[11px] text-[#212121]">
                          {item.name}
                        </strong>
                        <span className="block text-[10px] text-[#929292]">
                          {item.id} · {option?.available ?? ""}
                        </span>
                      </span>
                      <div className="flex flex-col gap-1 items-end">
                        {option && option.options.length > 0 && (
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {option.options.slice(0, 5).map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setMaterialQuantity(item.id, value)}
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition",
                                  item.quantity === value
                                    ? "bg-[#38529B] text-white"
                                    : "bg-[#EFEFEF] text-[#555] hover:bg-[#E0E0E0]",
                                )}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="relative inline-flex items-center">
                          <label
                            className="sr-only"
                            htmlFor={`material-qty-${item.id}`}
                          >
                            Jumlah {item.name}
                          </label>
                          <input
                            id={`material-qty-${item.id}`}
                            type="number"
                            min={0}
                            step="any"
                            value={item.quantity || ""}
                            onChange={(event) => {
                              const val = parseFloat(event.target.value);
                              setMaterialQuantity(item.id, isNaN(val) ? 0 : val);
                            }}
                            className="h-8 w-24 rounded-lg border border-[#E1E1E1] bg-white px-2 pr-7 text-[12px] font-semibold tabular-nums focus:border-[#38529B] focus:outline-none"
                          />
                          <span className="pointer-events-none absolute right-2 text-[10px] font-bold text-[#6B6B6B]">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setMaterials((current) =>
                            current.filter((entry) => entry.id !== item.id),
                          )
                        }
                        aria-label={`Hapus ${item.name}`}
                        className="flex size-10 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#EEEEEE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </FormRow>
          <FormRow icon={AlignLeft} label="Keperluan / Catatan Riset">
            <textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              rows={2}
              placeholder="Tuliskan tujuan penelitian, parameter alat, atau kebutuhan koordinasi khusus..."
              aria-label="Keperluan"
              className="w-full rounded-xl border border-[#E1E1E1] p-2.5 text-[12px] leading-5 text-[#212121] outline-none placeholder:text-[#B7B7B7] focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
            />
          </FormRow>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[11px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending
              ? "Memproses..."
              : editing
                ? "Simpan & kirim ulang"
                : "Kirim Pengajuan"}
          </button>
        </div>
      </form>
      {picker === "instrument" && (
        <EquipmentPickerModal
          roomId={roomId}
          targetClassification="INSTRUMENT"
          selected={equipment}
          onChange={setEquipment}
          onClose={() => {
            setPicker(null);
            instrumentTriggerRef.current?.focus();
          }}
        />
      )}
      {picker === "tool" && (
        <EquipmentPickerModal
          roomId={roomId}
          targetClassification="TOOL"
          selected={equipment}
          onChange={setEquipment}
          onClose={() => {
            setPicker(null);
            toolTriggerRef.current?.focus();
          }}
        />
      )}
      {picker === "materials" && (
        <MaterialPickerModal
          roomId={roomId}
          selected={materials}
          onChange={setMaterials}
          onClose={() => {
            setPicker(null);
            materialTriggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function toLocalInputValue(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(iso));
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour") === "24" ? "00" : pick("hour")}:${pick("minute")}`;
}

export function SharedUsageForm({
  event,
  onCancel,
}: {
  event: ScheduleEvent;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [startAt, setStartAt] = useState(toLocalInputValue(event.startAt));
  const [endAt, setEndAt] = useState(toLocalInputValue(event.endAt));
  const [purpose, setPurpose] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!event.reservationId) return null;

  if (sent) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#03683A]">
          Permintaan terkirim
        </p>
        <h4 className="mt-1 text-[15px] font-bold text-[#212121]">
          Menunggu jawaban {event.actor}
        </h4>
        <p className="mt-2 rounded-xl bg-[#E9EEFC] p-3 text-[11px] leading-5 text-[#38529B]">
          Pemilik reservation menerima notifikasi. Kalau disetujui, shared usage
          muncul di kalender kamu tanpa membuat reservation baru.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5]"
        >
          Tutup
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (submitEvent) => {
        submitEvent.preventDefault();
        setPending(true);
        setError(null);
        try {
          await apiRequest("/api/shared-usage", {
            method: "POST",
            body: {
              reservationId: event.reservationId,
              startAt: `${startAt}:00+07:00`,
              endAt: `${endAt}:00+07:00`,
              purpose: purpose.trim(),
            },
          });
          setSent(true);
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught));
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#929292]">
        Pengajuan Sesi Bersama
      </p>
      <h4 className="mt-1 text-[15px] font-bold text-[#212121]">
        {event.equipment?.[0]?.name ?? event.resourceId} · {event.resourceUnit}
      </h4>
      <p className="mt-1 text-[11px] text-[#6B6B6B]">
        Reservasi {event.actor} · {event.roomName}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#FDE9E9] p-2.5 text-[11px] leading-5 text-[#9E3636]"
        >
          {error}
        </p>
      )}
      <div className="mt-4 space-y-3">
        <label className="block text-[11px] font-semibold text-[#212121]">
          Mulai
          <input
            type="datetime-local"
            value={startAt}
            min={toLocalInputValue(event.startAt)}
            max={toLocalInputValue(event.endAt)}
            onChange={(input) => setStartAt(input.target.value)}
            className={cn(fieldClass, "mt-1")}
            required
          />
        </label>
        <label className="block text-[11px] font-semibold text-[#212121]">
          Selesai
          <input
            type="datetime-local"
            value={endAt}
            min={startAt}
            max={toLocalInputValue(event.endAt)}
            onChange={(input) => setEndAt(input.target.value)}
            className={cn(fieldClass, "mt-1")}
            required
          />
        </label>
        <p className="text-[10px] leading-4 text-[#929292]">
          Interval harus berada di dalam waktu reservasi utama (
          {toLocalInputValue(event.startAt).replace("T", " ")} –{" "}
          {toLocalInputValue(event.endAt).replace("T", " ")} WIB).
        </p>
        <label className="block text-[11px] font-semibold text-[#212121]">
          Tujuan Penggunaan
          <textarea
            value={purpose}
            onChange={(input) => setPurpose(input.target.value)}
            rows={2}
            placeholder="Bagian mana atau instrumen apa yang ingin kamu gunakan bersama"
            className="mt-1 w-full rounded-xl border border-[#E1E1E1] p-2.5 text-[12px] outline-none focus:border-[#6E8EDA] focus:ring-2 focus:ring-[#6E8EDA]/20"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#212121] px-4 text-[11px] font-bold text-white hover:bg-[#3A3A3A] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Memproses..." : "Kirim Permintaan"}
        </button>
      </div>
    </form>
  );
}

export function ScheduleEventPopover({
  event,
  rangeLabel,
  month,
  extraActions,
}: {
  event: ScheduleEvent;
  rangeLabel: string;
  month: { year: number; month: number };
  extraActions?: ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "shared">("view");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = isOwnEvent(event);
  const editable =
    mine &&
    event.kind === "request" &&
    (event.status === "PENDING_PLP" || event.status === "REQUEST_REVISION");
  const cancellable =
    mine &&
    event.kind === "request" &&
    ["PENDING_PLP", "REQUEST_REVISION", "APPROVED", "READY_FOR_PICKUP"].includes(
      event.status,
    );
  const canShare =
    !mine &&
    event.kind === "reservation" &&
    (event.status === "APPROVED" || event.status === "ACTIVE") &&
    Boolean(event.reservationId);

  if (mode === "edit") {
    const times = splitEventTime(event.time);
    return (
      <ScheduleRequestForm
        range={{ start: event.startDay, end: event.endDay }}
        label={rangeLabel}
        month={month}
        editingId={event.requestId}
        defaults={{
          title: event.title,
          roomCode: event.roomId,
          equipment: event.equipment ?? [],
          materials: event.materials ?? [],
          startTime: times.startTime,
          endTime: times.endTime,
          purpose: event.purpose,
          supervisor: event.supervisor ?? "",
          fieldPic: event.fieldPic ?? "",
        }}
        onCancel={() => setMode("view")}
      />
    );
  }

  if (mode === "shared") {
    return <SharedUsageForm event={event} onCancel={() => setMode("view")} />;
  }

  return (
    <>
      <ScheduleEventCard
        event={event}
        rangeLabel={rangeLabel}
        roomName={event.roomName}
        showTimeline={event.kind === "request"}
        actions={
          <>
            {editable && (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                {event.status === "REQUEST_REVISION"
                  ? "Edit & Ajukan Ulang"
                  : "Edit Pengajuan"}
              </button>
            )}
            {canShare && (
              <button
                type="button"
                onClick={() => setMode("shared")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#212121] px-3 text-[11px] font-bold text-white hover:bg-[#3A3A3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Ajukan Sesi Bersama
              </button>
            )}
            {cancellable && event.requestId && (
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  if (!confirmCancel) {
                    setConfirmCancel(true);
                    return;
                  }
                  setPending(true);
                  setError(null);
                  try {
                    await apiRequest(`/api/requests/${event.requestId}`, {
                      method: "DELETE",
                    });
                    router.refresh();
                  } catch (caught) {
                    setError(errorMessage(caught));
                  } finally {
                    setPending(false);
                    setConfirmCancel(false);
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#F5D0D0] bg-[#FFF7F7] px-3 text-[11px] font-bold text-[#9E3636] hover:bg-[#FDE9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
              >
                {pending
                  ? "Memproses..."
                  : confirmCancel
                    ? "Konfirmasi Batalkan"
                    : "Batalkan Pengajuan"}
              </button>
            )}
            {event.resourceId && (
              <Link
                href={`/student/laboratory/equipment/${event.resourceId}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                Lihat Detail Instrumen
              </Link>
            )}
            {extraActions}
          </>
        }
      />
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#FDE9E9] p-3 text-[11px] leading-5 text-[#9E3636]"
        >
          {error}
        </p>
      )}
    </>
  );
}


