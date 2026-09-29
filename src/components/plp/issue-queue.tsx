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
        <dt className="text-[#929292]">Mahasiswa</dt>
        <dd className="font-medium text-[#212121]">{request.actorName}</dd>
      </div>
      <div>
        <dt className="text-[#929292]">Activity</dt>
        <dd className="font-medium text-[#212121]">{request.activityTitle}</dd>
      </div>
      <div>
        <dt className="text-[#929292]">Room</dt>
        <dd className="font-medium text-[#212121]">{request.roomName}</dd>
      </div>
      <div>
        <dt className="text-[#929292]">Jadwal</dt>
        <dd className="font-medium text-[#212121] [font-variant-numeric:tabular-nums]">
          {formatRange(request.startAt, request.endAt)}
        </dd>
      </div>
    </dl>
  );
}

function ItemLists({ request }: { request: FulfillmentRequest }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#929292]">
          Equipment
        </p>
        {request.equipment.length === 0 ? (
          <p className="mt-1 text-[12px] text-[#6B6B6B]">Tidak ada</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {request.equipment.map((item) => (
              <li
                key={item.unitCode}
                className="flex items-center gap-2 text-[12px] text-[#212121]"
              >
                <CatalogImage
                  mediaId={item.imageMediaId}
                  alt={item.assetName}
                  size={26}
                  className="rounded-md"
                />
                <span className="min-w-0">
                  {item.unitCode} · {item.assetName}{" "}
                  <span className="text-[11px] text-[#6B6B6B]">
                    ({item.usageType === "BORROWABLE" ? "borrowable" : "usage only"})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#929292]">
          Material (jumlah diserahkan)
        </p>
        {request.materials.length === 0 ? (
          <p className="mt-1 text-[12px] text-[#6B6B6B]">Tidak ada</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {request.materials.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 text-[12px] text-[#212121]"
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
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-4 py-3 text-[12px] font-medium text-[#9E3636]"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          {success}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-6 text-center text-[12px] text-[#6B6B6B]">
          Tidak ada request yang cocok dengan pencarian &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((request) => (
          <li key={request.id} className="rounded-2xl border border-[#E1E1E1] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#212121]">
                  {request.title}
                </p>
                <p className="mt-0.5 text-[11px] text-[#929292]">
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Konfirmasi serahkan
                </button>
              )}
            </div>

            {activeId === request.id && (
              <div className="mt-3 rounded-xl border border-[#F2D9A4] bg-[#FFFDF7] p-3">
                <label className="flex items-start gap-2.5 text-[12px] text-[#5D4A1B]">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(event) => setVerified(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-[#B7B7B7]"
                  />
                  <span className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Saya sudah memverifikasi identitas {request.actorName} dan
                    menyerahkan jumlah material sesuai daftar.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => issue(request)}
                  disabled={pending}
                  className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
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
