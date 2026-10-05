"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Search, ShieldCheck } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";
import { CatalogImage } from "@/components/catalog-image";
import { RequestStatusBadge, formatRange, controlClass } from "@/components/workspace";
import type { FulfillmentRequest } from "@/components/plp/types";

function RequestSummary({ request }: { request: FulfillmentRequest }) {
  return (
    <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
      <div>
        <dt className="text-[#64748B]">Mahasiswa</dt>
        <dd className="font-medium text-[#121826]">{request.actorName}</dd>
      </div>
      <div>
        <dt className="text-[#64748B]">Activity</dt>
        <dd className="font-medium text-[#121826]">{request.activityTitle}</dd>
      </div>
      <div>
        <dt className="text-[#64748B]">Room</dt>
        <dd className="font-medium text-[#121826]">{request.roomName}</dd>
      </div>
      <div>
        <dt className="text-[#64748B]">Jadwal</dt>
        <dd className="font-medium text-[#121826] [font-variant-numeric:tabular-nums]">
          {formatRange(request.startAt, request.endAt)}
        </dd>
      </div>
    </dl>
  );
}

function ItemLists({ request }: { request: FulfillmentRequest }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
          Equipment
        </p>
        {request.equipment.length === 0 ? (
          <p className="mt-1 text-[12px] text-[#64748B]">Tidak ada</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {request.equipment.map((item) => (
              <li
                key={item.unitCode}
                className="flex items-center gap-2 text-[12px] text-[#121826]"
              >
                <CatalogImage
                  mediaId={item.imageMediaId}
                  alt={item.assetName}
                  size={26}
                  className="rounded-md"
                />
                <span className="min-w-0">
                  {item.unitCode} · {item.assetName}{" "}
                  <span className="text-[11px] text-[#64748B]">
                    ({item.usageType === "BORROWABLE" ? "borrowable" : "usage only"})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
          Material (jumlah diserahkan)
        </p>
        {request.materials.length === 0 ? (
          <p className="mt-1 text-[12px] text-[#64748B]">Tidak ada</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {request.materials.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 text-[12px] text-[#121826]"
              >
                <CatalogImage
                  mediaId={item.imageMediaId}
                  alt={item.name}
                  size={26}
                  className="rounded-md"
                />
                <span className="min-w-0">
                  {item.name} · {item.quantity} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function IssueQueue({
  requests,
}: {
  requests: FulfillmentRequest[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const eqText = r.equipment.map((e) => `${e.unitCode} ${e.assetName}`).join(" ").toLowerCase();
    const matText = r.materials.map((m) => m.name).join(" ").toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.actorName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.roomName.toLowerCase().includes(q) ||
      eqText.includes(q) ||
      matText.includes(q)
    );
  });

  async function ready(request: FulfillmentRequest) {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/plp/requests/${request.id}/ready`, {
        method: "POST",
      });
      setSuccess(`${request.code} ditandai siap diambil. Student diberi tahu.`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function issue(request: FulfillmentRequest) {
    if (!verified) {
      setError(
        "Centang konfirmasi verifikasi identitas dan jumlah material dulu.",
      );
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/requests/${request.id}/issue`, { method: "POST" });
      setSuccess(`${request.code} berstatus ACTIVE. Material sudah dikurangi.`);
      setActiveId(null);
      setVerified(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-5 py-10 text-center">
        <PackageCheck className="mx-auto size-6 text-[#929292]" aria-hidden="true" />
        <p className="mt-3 text-[13px] font-semibold text-[#212121]">
          Tidak ada request siap di-issue
        </p>
        <p className="mt-1 text-[12px] text-[#6B6B6B]">
          Request yang disetujui akan muncul di sini untuk diserahkan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929292]" />
        <input
          type="search"
          placeholder="Cari kode request, nama mahasiswa, judul, alat, atau bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={controlClass + " pl-9"}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#DC2626]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[12px] font-medium text-[#16A34A]"
        >
          {success}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-6 text-center text-[12px] text-[#64748B]">
          Tidak ada request yang cocok dengan pencarian &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((request) => (
          <li key={request.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#121826]">
                  {request.title}
                </p>
                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  {request.code}
                </p>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>
            <div className="mt-3">
              <RequestSummary request={request} />
              <ItemLists request={request} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {request.status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => ready(request)}
                  disabled={pending}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                >
                  Tandai siap diambil
                </button>
              )}
              {request.status === "READY_FOR_PICKUP" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(activeId === request.id ? null : request.id);
                    setVerified(false);
                    setError("");
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Konfirmasi serahkan
                </button>
              )}
            </div>

            {activeId === request.id && (
              <div className="mt-3 rounded-xl border border-[#FDE68A] bg-[#FEF7E6] p-3.5">
                <label className="flex items-start gap-2.5 text-[12px] text-[#8D6500]">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(event) => setVerified(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-[#D1D5DB] text-[#FDB913] focus:ring-[#FDB913]"
                  />
                  <span className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8D6500]" aria-hidden="true" />
                    Saya sudah memverifikasi identitas {request.actorName} dan
                    menyerahkan jumlah material sesuai daftar.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => issue(request)}
                  disabled={pending}
                  className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
                >
                  {pending ? "Memproses..." : "Serahkan sekarang"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
}
