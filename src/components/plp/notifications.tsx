"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { formatDateTime } from "@/components/workspace";
import type { NotificationView } from "@/components/schedule-data";

export function WorkspaceNotifications({
  notifications,
  unread,
}: {
  notifications: NotificationView[];
  unread: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function readAll() {
    setPending(true);
    setError("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function readOne(id: string) {
    setError("");
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-[#6B6B6B]">
          {unread > 0 ? `${unread} belum dibaca` : "Semua notifikasi terbaca"}
        </p>
        {unread > 0 && (
          <button
            onClick={readAll}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {pending ? "Memproses..." : "Tandai semua terbaca"}
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-4 py-3 text-[12px] font-medium text-[#9E3636]"
        >
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-5 py-10 text-center">
          <Bell className="mx-auto size-6 text-[#929292]" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold text-[#212121]">
            Belum ada notifikasi
          </p>
          <p className="mt-1 text-[12px] text-[#6B6B6B]">
            Update request, fulfillment, dan incident akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={
                "dashboard-card flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between " +
                (item.readAt ? "" : "border-[#F2D9A4] bg-[#FFFDF7]")
              }
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#212121]">
                  {item.title}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6B6B6B]">
                  {item.message}
                </p>
                <p className="mt-2 text-[11px] text-[#929292] [font-variant-numeric:tabular-nums]">
                  {formatDateTime(item.createdAt)}
                  {item.readAt ? " · sudah dibaca" : " · baru"}
                </p>
              </div>
              {!item.readAt && (
                <button
                  onClick={() => readOne(item.id)}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] transition hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  Tandai terbaca
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
