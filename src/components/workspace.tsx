import Link from "next/link";
import { cn } from "cn";
import { StatusBadge, toneClasses } from "@/components/status-badge";
import {
  requestStatusLabels,
  requestStatusTone,
  type IncidentStatus,
  type IncidentView,
  type RequestStatus,
} from "@/components/schedule-data";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[22px] font-bold leading-8 tracking-[-0.03em] text-[#212121] sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#6B6B6B]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function Panel({
  title,
  context,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  context?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "dashboard-card overflow-hidden",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {(title || action) && (
        <div
          className={cn(
            "mb-4 flex items-start justify-between gap-3",
            !padded && "px-4 pt-4 sm:px-5 sm:pt-5",
          )}
        >
          <div className="min-w-0">
            {context && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#929292]">
                {context}
              </p>
            )}
            {title && (
              <h2 className="text-[15px] font-semibold text-[#212121]">
                {title}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  href,
  tone = "cream",
}: {
  label: string;
  value: number | string;
  detail?: string;
  href?: string;
  tone?: keyof typeof toneClasses;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[#6B6B6B]">{label}</p>
        <span className={cn("size-2 rounded-full", toneClasses[tone].dot)} />
      </div>
      <p className="mt-3 text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#212121] [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      {detail && <p className="mt-1 text-[11px] text-[#6B6B6B]">{detail}</p>}
    </>
  );
  const className =
    "dashboard-card block p-4 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] " +
    (href ? "hover:-translate-y-0.5 hover:border-[#D6C6A6]" : "");
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-5 py-8 text-center">
      <p className="text-[13px] font-semibold text-[#212121]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-[#6B6B6B]">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  if (status in requestStatusLabels) {
    const key = status as RequestStatus;
    return (
      <StatusBadge tone={requestStatusTone(key)}>
        {requestStatusLabels[key]}
      </StatusBadge>
    );
  }
  return <StatusBadge tone="cream">{status.replaceAll("_", " ")}</StatusBadge>;
}

const incidentTone: Record<
  IncidentStatus,
  keyof typeof toneClasses
> = {
  REPORTED: "rose",
  UNDER_ASSESSMENT: "blue",
  IN_MAINTENANCE: "yellow",
  RESOLVED: "green",
};

const incidentLabel: Record<IncidentStatus, string> = {
  REPORTED: "Reported",
  UNDER_ASSESSMENT: "Under assessment",
  IN_MAINTENANCE: "In maintenance",
  RESOLVED: "Resolved",
};

export function IncidentBadge({ incident }: { incident: IncidentView }) {
  return (
    <StatusBadge tone={incidentTone[incident.status]}>
      {incidentLabel[incident.status]}
    </StatusBadge>
  );
}

export function SeverityBadge({ severity }: { severity: IncidentView["severity"] }) {
  const tone =
    severity === "CRITICAL"
      ? "rose"
      : severity === "HIGH"
        ? "yellow"
        : severity === "MEDIUM"
          ? "blue"
          : "cream";
  return <StatusBadge tone={tone}>{severity}</StatusBadge>;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatRange(startAt: string, endAt: string) {
  return `${formatDate(startAt)} · ${formatTime(startAt)}-${formatTime(endAt)}`;
}

export const SkeletonBlock = ({
  className,
}: {
  className?: string;
}) => (
  <div
    className={cn("animate-pulse rounded-lg bg-[#EEEEEE]", className)}
    aria-hidden="true"
  />
);

export const controlClass =
  "h-11 w-full rounded-xl border border-[#E1E1E1] bg-white px-3 text-[13px] text-[#212121] outline-none transition focus:border-[#6E8EDA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]";

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FilterBar({
  action,
  children,
  clearHref,
  activeCount = 0,
}: {
  action: string;
  children: React.ReactNode;
  clearHref?: string;
  activeCount?: number;
}) {
  return (
    <form
      method="get"
      action={action}
      className="dashboard-card mb-5 flex flex-wrap items-end gap-3 p-4"
    >
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
        >
          Terapkan filter
        </button>
        {clearHref && activeCount > 0 && (
          <Link
            href={clearHref}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] transition hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Hapus filter ({activeCount})
          </Link>
        )}
      </div>
    </form>
  );
}

export function Pagination({
  basePath,
  query,
  page,
  totalPages,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const link = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  };
  return (
    <nav
      className="mt-5 flex items-center justify-between gap-3"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link
          href={link(page - 1)}
          className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
        >
          Sebelumnya
        </Link>
      ) : (
        <span />
      )}
      <p className="text-[12px] text-[#6B6B6B] [font-variant-numeric:tabular-nums]">
        Halaman {page} dari {totalPages}
      </p>
      {page < totalPages ? (
        <Link
          href={link(page + 1)}
          className="inline-flex min-h-11 items-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
        >
          Berikutnya
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
