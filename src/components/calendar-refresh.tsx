"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Keeps a calendar current: a visible refresh action plus an automatic refresh
// when the tab becomes active again, so a PLP approval shows up without a hard
// reload.
export function CalendarRefresh() {
  const router = useRouter();

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-3 text-[11px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
    >
      <RefreshCw className="size-3.5" aria-hidden="true" />
      Muat ulang
    </button>
  );
}
