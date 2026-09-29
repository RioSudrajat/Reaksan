import { Download } from "lucide-react";
import { cn } from "cn";

// Server-safe download link. The API route validates the filters and audits
// the export before sending the CSV attachment.
export function ExportLink({
  report,
  query,
  label = "Unduh CSV",
  className,
}: {
  report: string;
  query?: Record<string, string | undefined>;
  label?: string;
  className?: string;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  const suffix = params.toString();
  return (
    <a
      href={`/api/exports/${report}${suffix ? `?${suffix}` : ""}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
        className,
      )}
    >
      <Download className="size-4 text-[#6B6B6B]" aria-hidden="true" />
      {label}
    </a>
  );
}
