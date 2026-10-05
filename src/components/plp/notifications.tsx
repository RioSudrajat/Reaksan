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
        <p className="text-[12px] font-medium text-[#475569]">
          {unread > 0 ? `${unread} belum dibaca` : "Semua notifikasi terbaca"}
        </p>
        {unread > 0 && (
          <button
            onClick={readAll}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {pending ? "Memproses..." : "Tandai semua terbaca"}
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#991B1B]"
        >
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA] px-5 py-10 text-center">
          <Bell className="mx-auto size-6 text-[#64748B]" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold text-[#121826]">
            Belum ada notifikasi
          </p>
          <p className="mt-1 text-[12px] text-[#475569]">
            Update request, fulfillment, dan incident akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={
                "dashboard-card flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between transition " +
                (item.readAt
                  ? "border-[#E5E7EB] bg-white"
                  : "border-[#FDE68A] bg-[#FEF7E6]/40")
              }
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#121826]">
                  {item.title}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#475569]">
                  {item.message}
                </p>
                <p className="mt-2 text-[11px] text-[#64748B] [font-variant-numeric:tabular-nums]">
                  {formatDateTime(item.createdAt)}
                  {item.readAt ? " · sudah dibaca" : " · baru"}
                </p>
              </div>
              {!item.readAt && (
                <button
                  onClick={() => readOne(item.id)}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-[12px] font-bold text-[#8D6500] transition hover:bg-[#FEF7E6] hover:text-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
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
