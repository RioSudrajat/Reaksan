"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim().length > 0) {
        params.set(key, value.trim());
      }
    }
    const queryString = params.toString();
    const target = queryString ? `${action}?${queryString}` : action;
    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  }

  const formKey = searchParams.toString();

  return (
    <form
      key={formKey}
      method="get"
      action={action}
      onSubmit={handleSubmit}
      className="dashboard-card mb-5 flex flex-wrap items-end gap-3 p-4 transition-opacity duration-200"
      style={{ opacity: isPending ? 0.7 : 1 }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-70"
        >
          {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {isPending ? "Memuat..." : "Terapkan filter"}
        </button>
        {clearHref && activeCount > 0 && (
          <Link
            href={clearHref}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] transition hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
          >
            Hapus filter ({activeCount})
          </Link>
        )}
      </div>
    </form>
  );
}
