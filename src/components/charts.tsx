import Link from "next/link";
import { cn } from "cn";
import { Panel } from "@/components/workspace";

export type ChartTone =
  | "yellow"
  | "blue"
  | "green"
  | "rose"
  | "amber"
  | "neutral"
  | "cream"
  | "dark"
  | "yellow-light"
  | "muted";

export const chartColor: Record<ChartTone, string> = {
  yellow: "#F9B129",
  blue: "#6E8EDA",
  green: "#048444",
  rose: "#F45959",
  amber: "#F7B742",
  neutral: "#929292",
  cream: "#FEF1CC",
  dark: "#212121",
  "yellow-light": "#FCDD94",
  muted: "#D9D9D9",
};

function Legend({  items,
}: {
  items: { label: string; tone: ChartTone; value?: number | string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B6B6B]"
        >
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: chartColor[item.tone] }}
            aria-hidden="true"
          />
          <span>
            {item.label}
            {item.value !== undefined ? `: ${item.value}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ChartPanel({
  context,
  title,
  range,
  action,
  legend,
  footnote,
  children,
  className,
}: {
  context?: string;
  title: string;
  range?: string;
  action?: React.ReactNode;
  legend?: { label: string; tone: ChartTone; value?: number | string }[];
  footnote?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel context={context} title={title} action={action} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {range ? (
          <p className="text-[11px] font-medium text-[#6B6B6B]">{range}</p>
        ) : (
          <span />
        )}
      </div>
      {legend && legend.length > 0 && (
        <div className="mt-2">
          <Legend items={legend} />
        </div>
      )}
      <div className="mt-4">{children}</div>
      {footnote && (
        <div className="mt-3 border-t border-[#EEEEEE] pt-3 text-[11px] leading-4 text-[#6B6B6B]">
          {footnote}
        </div>
      )}
    </Panel>
  );
}

export function ChartEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-5 py-8 text-center">
      <p className="text-[13px] font-semibold text-[#212121]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-[#6B6B6B]">
        {description}
      </p>
    </div>
  );
}

export function StackedBarChart({
  buckets,
  unit = "",
  max,
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
  max?: number;
  ariaLabel: string;
}) {
  const largest =
    max ?? Math.max(1, ...buckets.map((bucket) => totalOf(bucket)));
  return (
    <div>
      <div
        className="flex h-44 items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label={ariaLabel}
      >
        {buckets.map((bucket) => {
          const total = totalOf(bucket);
          const height = Math.max(total > 0 ? 6 : 2, (total / largest) * 100);
          const body = (
            <>
              <span className="text-[10px] font-semibold tabular-nums text-[#212121]">
                {total > 0 ? total : ""}
              </span>
              <span
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-md border border-[#E1E1E1] bg-[#F5F5F5]"
                style={{ height: `${height}%` }}
              >
                {bucket.segments
                  .filter((segment) => segment.value > 0)
                  .map((segment) => (
                    <span
                      key={segment.key}
                      className="w-full"
                      style={{
                        height: `${(segment.value / total) * 100}%`,
                        backgroundColor: chartColor[segment.tone],
                      }}
                      title={`${segment.label}: ${segment.value}${unit ? ` ${unit}` : ""}`}
                    />
                  ))}
              </span>
            </>
          );
          const description = bucket.segments
            .filter((segment) => segment.value > 0)
            .map((segment) => `${segment.label} ${segment.value}`)
            .join(", ");
          return (
            <div
              key={bucket.key}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              {bucket.href ? (
                <Link
                  href={bucket.href}
                  className="flex h-full w-full flex-col items-center justify-end gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                  aria-label={`${bucket.label}: ${description || "tidak ada data"}`}
                >
                  {body}
                </Link>
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-end gap-1"
                  aria-label={`${bucket.label}: ${description || "tidak ada data"}`}
                >
                  {body}
                </div>
              )}
              <span
                className="w-full text-center text-[9.5px] sm:text-[10px] font-medium text-[#6B6B6B] leading-tight line-clamp-2 px-0.5"
                title={bucket.sublabel ? `${bucket.label} (${bucket.sublabel})` : bucket.label}
              >
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Periode</th>
              {buckets[0]?.segments.map((segment) => (
                <th key={segment.key} scope="col">
                  {segment.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.key}>
                <th scope="row">{bucket.label}</th>
                {bucket.segments.map((segment) => (
                  <td key={segment.key}>{segment.value}</td>
                ))}
                <td>{totalOf(bucket)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function totalOf(bucket: { segments: { value: number }[] }) {
  return bucket.segments.reduce((sum, segment) => sum + segment.value, 0);
}

export function HorizontalBarChart({
  rows,
  unit = "",
  max,
  threshold,
}: {
  rows: {
    key: string;
    label: string;
    sublabel?: string;
    value: number;
    tone: ChartTone;
    href?: string;
    detail?: string;
  }[];
  unit?: string;
  max?: number;
  threshold?: { value: number; label: string };
}) {
  const largest = Math.max(
    1,
    max ?? 0,
    threshold?.value ?? 0,
    ...rows.map((row) => row.value),
  );
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const percent = (row.value / largest) * 100;
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[12px] font-semibold text-[#212121]">
                {row.label}
              </span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#212121]">
                {formatNumber(row.value)}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
            {row.sublabel && (
              <p className="mt-0.5 truncate text-[11px] text-[#929292]">
                {row.sublabel}
              </p>
            )}
            <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-[#EEEEEE]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.max(row.value > 0 ? 2 : 0, percent)}%`,
                  backgroundColor: chartColor[row.tone],
                }}
              />
              {threshold && threshold.value > 0 && (
                <span
                  className="absolute inset-y-0 w-0 border-l-2 border-dashed border-[#212121]"
                  style={{ left: `${(threshold.value / largest) * 100}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            {row.detail && (
              <p className="mt-1 text-[11px] text-[#6B6B6B]">{row.detail}</p>
            )}
          </>
        );
        return row.href ? (
          <Link
            key={row.key}
            href={row.href}
            className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            {body}
          </Link>
        ) : (
          <div key={row.key}>{body}</div>
        );
      })}
      {threshold && (
        <p className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
          <span
            className="inline-block h-3 w-0 border-l-2 border-dashed border-[#212121]"
            aria-hidden="true"
          />
          {threshold.label}
        </p>
      )}
    </div>
  );
}

export function StatusBarList({
  rows,
}: {
  rows: {
    key: string;
    label: string;
    value: number;
    tone: ChartTone;
    href?: string;
  }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const visible = rows.filter((row) => row.value > 0);
  if (total === 0) {
    return (
      <ChartEmpty
        title="Belum ada data status"
        description="Data akan muncul setelah ada equipment yang terdaftar."
      />
    );
  }
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-[#EEEEEE]"
        aria-hidden="true"
      >
        {visible.map((row) => (
          <span
            key={row.key}
            style={{
              width: `${(row.value / total) * 100}%`,
              backgroundColor: chartColor[row.tone],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map((row) => (
          <li key={row.key}>
            {row.href ? (
              <Link
                href={row.href}
                className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-[12px] text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: chartColor[row.tone] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="font-semibold tabular-nums">{row.value}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-1 py-0.5 text-[12px] text-[#212121]">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: chartColor[row.tone] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="font-semibold tabular-nums">{row.value}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-semibold text-[#121826] underline decoration-[#FDB913] underline-offset-2 hover:text-[#8D6500] hover:decoration-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function RangeSwitcher({
  basePath = "",
  param,
  name,
  value,
  options,
  ariaLabel,
}: {
  basePath?: string;
  param?: string;
  name?: string;
  value: string;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const queryParam = param ?? name ?? "range";
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-1">
      {options.map((option) => {
        const active = option.value === value;
        const href = basePath
          ? `${basePath}?${queryParam}=${option.value}`
          : `?${queryParam}=${option.value}`;
        return (
          <Link
            key={option.value}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center rounded-lg px-2.5 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]",
              active
                ? "bg-[#FEF7E6] text-[#8D6500] border border-[#FDE68A]"
                : "text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#121826]",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DonutGauge({
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
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 150;
  const strokeWidth = 14;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex shrink-0 items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
          role="img"
          aria-label={ariaLabel}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((segment) => {
                const strokeLength = (segment.value / total) * circumference;
                const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += strokeLength;

                return (
                  <circle
                    key={segment.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={chartColor[segment.tone]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 ease-out"
                  />
                );
              })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[24px] font-extrabold tracking-tight text-[#121826] tabular-nums">
            {Math.round(percentage)}%
          </span>
          <span className="max-w-[85px] text-[10px] font-semibold text-[#64748B] leading-tight">
            {label}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5 w-full">
        {sublabel && (
          <p className="text-[11px] font-medium text-[#64748B] border-b border-[#E5E7EB] pb-2">
            {sublabel}
          </p>
        )}
        <ul className="grid gap-1">
          {segments.map((segment) => {
            const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
            const content = (
              <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition hover:bg-[#F8F9FA]">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColor[segment.tone] }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[12px] font-medium text-[#121826]">
                    {segment.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] font-bold text-[#121826] tabular-nums">
                    {formatNumber(segment.value)} {unit}
                  </span>
                  <span className="text-[10px] font-medium text-[#94A3B8] tabular-nums">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );

            return (
              <li key={segment.key}>
                {segment.href ? (
                  <Link
                    href={segment.href}
                    className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Jumlah</th>
              <th scope="col">Persentase</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => (
              <tr key={segment.key}>
                <td>{segment.label}</td>
                <td>{segment.value}</td>
                <td>{total > 0 ? Math.round((segment.value / total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AreaRunwayChart({
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
  const weekBuckets = buckets.filter((b) => b.key !== "overdue" && b.key !== "later");
  const values = weekBuckets.map((b) => b.value);
  const maxValue = Math.max(1, ...values);

  const width = 500;
  const height = 140;
  const paddingX = 25;
  const paddingTop = 15;
  const paddingBottom = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const stepX = weekBuckets.length > 1 ? chartWidth / (weekBuckets.length - 1) : chartWidth;

  const points = weekBuckets.map((b, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingTop + chartHeight - (b.value / maxValue) * chartHeight;
    return { x, y, value: b.value, bucket: b };
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

  return (
    <div className="space-y-3">
      {overdueCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#DC2626] animate-pulse" aria-hidden="true" />
            <span className="text-[12px] font-bold text-[#991B1B]">
              {overdueCount} batch bahan kimia telah melewati masa kadaluarsa (Overdue)
            </span>
          </div>
          <Link
            href={overdueHref}
            className="text-[11px] font-bold text-[#DC2626] underline hover:text-[#991B1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
          >
            Tinjau Disposal &rarr;
          </Link>
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id="runwayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDB913" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FDB913" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line
            x1={paddingX}
            y1={paddingTop + chartHeight}
            x2={width - paddingX}
            y2={paddingTop + chartHeight}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + chartHeight / 2}
            stroke="#F1F5F9"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {areaD && <path d={areaD} fill="url(#runwayGradient)" />}

          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((pt, idx) => (
            <g key={pt.bucket.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                className="fill-[#121826] stroke-white stroke-2"
              />
              {pt.value > 0 && (
                <text
                  x={pt.x}
                  y={pt.y - 7}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-[#121826] select-none"
                >
                  {pt.value}
                </text>
              )}
              <text
                x={pt.x}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                className="text-[9px] font-medium fill-[#64748B] select-none"
              >
                M{idx + 1}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-2 flex items-center justify-between text-[10px] text-[#94A3B8]">
          <span>Minggu 1 (Terdekat)</span>
          <span>Proyeksi Kedaluwarsa 8 Pekan ke Depan</span>
          <span>Minggu 8</span>
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Pekan</th>
              <th scope="col">Batch Kadaluarsa</th>
            </tr>
          </thead>
          <tbody>
            {overdueCount > 0 && (
              <tr>
                <td>Terlewat (Overdue)</td>
                <td>{overdueCount}</td>
              </tr>
            )}
            {weekBuckets.map((b, idx) => (
              <tr key={b.key}>
                <td>Minggu ke-{idx + 1} ({b.label})</td>
                <td>{b.value} batch</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}
