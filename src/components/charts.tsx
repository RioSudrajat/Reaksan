import Link from "next/link";
import { cn } from "cn";
import { Panel } from "@/components/workspace";

export type ChartTone = "yellow" | "blue" | "green" | "rose" | "amber" | "neutral";

export const chartColor: Record<ChartTone, string> = {
  yellow: "#F9B129",
  blue: "#6E8EDA",
  green: "#048444",
  rose: "#F45959",
  amber: "#F7B742",
  neutral: "#B7B7B7",
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
              <span className="w-full truncate text-center text-[10px] font-medium text-[#6B6B6B]">
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
        "font-semibold text-[#38529B] underline decoration-[#B7C7EC] underline-offset-2 hover:decoration-[#38529B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function RangeSwitcher({
  basePath,
  param,
  value,
  options,
  ariaLabel,
}: {
  basePath: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Link
            key={option.value}
            href={`${basePath}?${param}=${option.value}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-lg px-2.5 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
              active
                ? "bg-[#FEF1CC] text-[#705012]"
                : "text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#212121]",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}
