"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { chartColor, formatNumber, type ChartTone } from "@/components/charts";
import { ArrowRight } from "lucide-react";

// -------------------------------------------------------------
// 1. INTERACTIVE DONUT GAUGE (Kesiapan Alat Lab)
// -------------------------------------------------------------

export function InteractiveDonutGauge({
  percentage,
  label = "Siap Operasional",
  sublabel,
  segments,
  unit = "unit",
  ariaLabel,
}: {
  percentage: number;
  label?: string;
  sublabel?: string;
  segments: {
    key: string;
    label: string;
    value: number;
    tone: ChartTone;
    href?: string;
  }[];
  unit?: string;
  ariaLabel: string;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 160;
  const defaultStroke = 14;
  const activeStroke = 18;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const activeSegment = segments.find((s) => s.key === activeKey);
  const activePct =
    activeSegment && total > 0
      ? Math.round((activeSegment.value / total) * 100)
      : Math.round(percentage);

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
      {/* SVG Ring Visual */}
      <div className="relative flex shrink-0 items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Base track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E1E1E1"
            strokeWidth={defaultStroke}
          />

          {/* Segment rings */}
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((segment) => {
                const strokeLength = (segment.value / total) * circumference;
                const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += strokeLength;

                const isCurrentActive = activeKey === segment.key;

                return (
                  <circle
                    key={segment.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={chartColor[segment.tone]}
                    strokeWidth={isCurrentActive ? activeStroke : defaultStroke}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setActiveKey(segment.key)}
                    onMouseLeave={() => setActiveKey(null)}
                    style={{
                      filter: isCurrentActive
                        ? "drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                        : "none",
                    }}
                  />
                );
              })}
        </svg>

        {/* Center Dynamic Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none transition-all duration-200 px-3">
          <span className="text-[26px] font-bold tracking-tight text-[#212121] tabular-nums leading-none">
            {activeSegment ? formatNumber(activeSegment.value) : `${Math.round(percentage)}%`}
          </span>
          <span className="mt-1 max-w-[95px] text-[10px] font-semibold text-[#6B6B6B] leading-tight truncate">
            {activeSegment ? activeSegment.label : label}
          </span>
          <span className="text-[9px] font-medium text-[#929292] tabular-nums">
            {activeSegment ? `(${activePct}% armada)` : "Tingkat Kesiapan"}
          </span>
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="min-w-0 flex-1 space-y-1.5 w-full">
        {sublabel && (
          <p className="text-[11px] font-medium text-[#6B6B6B] border-b border-[#E1E1E1] pb-2">
            {sublabel}
          </p>
        )}
        <ul className="grid gap-1">
          {segments.map((segment) => {
            const pct =
              total > 0 ? Math.round((segment.value / total) * 100) : 0;
            const isHovered = activeKey === segment.key;

            return (
              <li
                key={segment.key}
                onMouseEnter={() => setActiveKey(segment.key)}
                onMouseLeave={() => setActiveKey(null)}
              >
                <Link
                  href={segment.href ?? "#"}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition border",
                    isHovered
                      ? "bg-[#FEF1CC]/50 border-[#F9B129]/60 shadow-2xs"
                      : "border-transparent hover:bg-[#F5F5F5]",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full transition-transform"
                      style={{
                        backgroundColor: chartColor[segment.tone],
                        transform: isHovered ? "scale(1.2)" : "scale(1)",
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "truncate text-[12px]",
                        isHovered
                          ? "font-semibold text-[#212121]"
                          : "font-normal text-[#6B6B6B]",
                      )}
                    >
                      {segment.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[12px] font-semibold text-[#212121] tabular-nums">
                      {formatNumber(segment.value)} {unit}
                    </span>
                    <span className="text-[10px] font-medium text-[#929292] tabular-nums">
                      ({pct}%)
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. INTERACTIVE AREA RUNWAY CHART (8-Week Reagent Expiry Runway)
// -------------------------------------------------------------

export function InteractiveAreaRunwayChart({
  buckets,
  overdueCount = 0,
  overdueHref = "/plp/inventory/materials?expiry=expired",
  ariaLabel,
}: {
  buckets: {
    key: string;
    label: string;
    sublabel?: string;
    value: number;
    tone?: ChartTone;
    href?: string;
  }[];
  overdueCount?: number;
  overdueHref?: string;
  ariaLabel: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const weekBuckets = buckets.filter(
    (b) => b.key !== "overdue" && b.key !== "later",
  );
  const values = weekBuckets.map((b) => b.value);
  const totalNearTerm = values.reduce((sum, v) => sum + v, 0);
  const maxValue = Math.max(1, ...values);

  const width = 500;
  const height = 150;
  const paddingX = 30;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const stepX =
    weekBuckets.length > 1 ? chartWidth / (weekBuckets.length - 1) : chartWidth;

  const points = weekBuckets.map((b, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingTop + chartHeight - (b.value / maxValue) * chartHeight;
    return { x, y, value: b.value, bucket: b, index: idx };
  });

  let pathD = "";
  let areaD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const lastPoint = points[points.length - 1];
    areaD = `${pathD} L ${lastPoint.x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="space-y-3">
      {/* Overdue Danger Strip */}
      {overdueCount > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-[#E1E1E1] bg-white px-3.5 py-2 transition shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-[#F45959]/40 bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#991B1B]">
              Perhatian
            </span>
            <span className="text-[12px] font-medium text-[#212121]">
              {overdueCount} batch bahan kimia telah melewati masa kedaluwarsa.
            </span>
          </div>
          <Link
            href={overdueHref}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#991B1B] hover:underline"
          >
            Tinjau Pemusnahan <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : totalNearTerm === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#E1E1E1] bg-[#F5F5F5]/60 px-3 py-2 text-[12px] text-[#212121]">
          <span className="rounded-md border border-[#048444]/30 bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#048444]">
            Aman
          </span>
          <span className="text-[11px] text-[#6B6B6B]">
            Tidak ada batch bahan mendekati kedaluwarsa dalam 8 pekan ke depan.
          </span>
        </div>
      ) : null}

      {/* SVG Interactive Area Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id="runwayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F9B129" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F9B129" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight}
            x2={width - paddingX}
            y2={paddingTop + chartHeight}
            stroke="#E1E1E1"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + chartHeight / 2}
            stroke="#EEEEEE"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Gradient area */}
          {areaD && <path d={areaD} fill="url(#runwayGradient)" />}

          {/* Curve stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#AE7C1D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={pt.bucket.key}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Invisible hover target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  className={cn(
                    "stroke-white stroke-2 transition-all duration-150",
                    isHovered
                      ? "fill-[#F9B129]"
                      : "fill-[#212121]",
                  )}
                />

                {/* Label value */}
                {pt.value > 0 && (
                  <text
                    x={pt.x}
                    y={pt.y - 8}
                    textAnchor="middle"
                    className={cn(
                      "text-[10px] tabular-nums select-none transition-all",
                      isHovered
                        ? "font-black fill-[#F9B129]"
                        : "font-bold fill-[#212121]",
                    )}
                  >
                    {pt.value}
                  </text>
                )}

                {/* X-axis week label */}
                <text
                  x={pt.x}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] select-none transition-colors",
                    isHovered
                      ? "font-extrabold fill-[#212121]"
                      : "font-semibold fill-[#6B6B6B]",
                  )}
                >
                  M{idx + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {activePoint && (
          <div
            className="absolute z-10 top-1 rounded-xl border border-[#F9B129]/50 bg-white/95 px-3 py-2 shadow-md pointer-events-none transition-all backdrop-blur-xs"
            style={{
              left: `${Math.max(16, Math.min(84, (activePoint.x / width) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-[11px] font-bold text-[#212121]">
              Pekan ke-{activePoint.index + 1} ({activePoint.bucket.label})
            </p>
            {activePoint.bucket.sublabel && (
              <p className="text-[10px] text-[#6B6B6B]">
                {activePoint.bucket.sublabel}
              </p>
            )}
            <p className="mt-0.5 text-[12px] font-extrabold text-[#AE7C1D] tabular-nums">
              {activePoint.value} batch bahan kimia
            </p>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#929292]">
          <span>Minggu 1 (Pekan Ini)</span>
          <span className="text-[10px] text-[#6B6B6B]">Arahkan kursor pada titik untuk rincian tanggal</span>
          <span>Minggu 8</span>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. INTERACTIVE STACKED BAR / REQUEST INFLOW
// -------------------------------------------------------------

export function InteractiveStackedBarChart({
  buckets,
  unit = "request",
  ariaLabel,
}: {
  buckets: {
    key: string;
    label: string;
    sublabel?: string;
    href?: string;
    segments: { key: string; label: string; value: number; tone: ChartTone }[];
  }[];
  unit?: string;
  ariaLabel: string;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const largest = Math.max(
    1,
    ...buckets.map((b) => b.segments.reduce((acc, s) => acc + s.value, 0)),
  );

  return (
    <div className="relative">
      <div
        className="flex h-44 items-end gap-1.5 sm:gap-2 pt-6"
        role="img"
        aria-label={ariaLabel}
      >
        {buckets.map((bucket) => {
          const total = bucket.segments.reduce((sum, s) => sum + s.value, 0);
          const height = Math.max(total > 0 ? 8 : 2, (total / largest) * 100);
          const isHovered = hoveredKey === bucket.key;

          return (
            <div
              key={bucket.key}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 group"
              onMouseEnter={() => setHoveredKey(bucket.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && total > 0 && (
                <div className="absolute -top-12 z-20 whitespace-nowrap rounded-xl border border-[#E1E1E1] bg-white px-2.5 py-1.5 shadow-md text-center pointer-events-none">
                  <p className="text-[11px] font-bold text-[#212121]">
                    {bucket.label}: {total} {unit}
                  </p>
                  <p className="text-[9px] text-[#6B6B6B]">
                    {bucket.segments
                      .filter((s) => s.value > 0)
                      .map((s) => `${s.label} (${s.value})`)
                      .join(" · ")}
                  </p>
                </div>
              )}

              {/* Total label */}
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums transition-colors",
                  isHovered ? "text-[#AE7C1D]" : "text-[#212121]",
                )}
              >
                {total > 0 ? total : ""}
              </span>

              {/* Stacked bar cylinder */}
              <Link
                href={bucket.href ?? "#"}
                className={cn(
                  "flex w-full flex-col-reverse overflow-hidden rounded-t-lg border transition-all duration-150",
                  isHovered
                    ? "border-[#F9B129] shadow-xs"
                    : "border-[#E1E1E1] bg-[#F5F5F5]",
                )}
                style={{ height: `${height}%` }}
              >
                {bucket.segments
                  .filter((s) => s.value > 0)
                  .map((segment) => (
                    <span
                      key={segment.key}
                      className="w-full transition-opacity group-hover:opacity-90"
                      style={{
                        height: `${(segment.value / total) * 100}%`,
                        backgroundColor: chartColor[segment.tone],
                      }}
                      title={`${segment.label}: ${segment.value} ${unit}`}
                    />
                  ))}
              </Link>

              {/* X-axis date label */}
              <span
                className={cn(
                  "w-full text-center text-[9.5px] sm:text-[10px] transition-colors leading-tight px-0.5 line-clamp-2",
                  isHovered
                    ? "font-bold text-[#212121]"
                    : "font-normal text-[#6B6B6B]",
                )}
                title={bucket.sublabel ? `${bucket.label} (${bucket.sublabel})` : bucket.label}
              >
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
