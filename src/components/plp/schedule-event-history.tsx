"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Printer,
  Calendar,
  User,
  Clock,
  ArrowUpRight,
  Loader2,
  FileDown,
} from "lucide-react";
import { cn } from "cn";
import { StatusBadge } from "@/components/status-badge";
import type { ScheduleEvent, RequestStatus } from "@/components/schedule-data";
import { requestStatusLabels, monthName, parseJakartaDate } from "@/components/schedule-data";
import { exportElementToPdf } from "@/lib/pdf-export";

export type StatusFilterOption = "ALL" | RequestStatus;

export function matchesScheduleEvent(
  event: ScheduleEvent,
  selectedStatus: StatusFilterOption = "ALL",
  search = "",
  currentRoomCode?: string,
): boolean {
  if (
    currentRoomCode &&
    event.roomId !== currentRoomCode &&
    (event as { roomCode?: string }).roomCode !== currentRoomCode
  ) {
    return false;
  }

  if (selectedStatus !== "ALL" && event.status !== selectedStatus) {
    return false;
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    const matchesActor = event.actor?.toLowerCase().includes(q);
    const matchesTitle = event.title?.toLowerCase().includes(q);
    const matchesPurpose = event.purpose?.toLowerCase().includes(q);
    const matchesCode = event.requestCode?.toLowerCase().includes(q);
    const matchesSupervisor = event.supervisor?.toLowerCase().includes(q);
    const matchesRoom = event.roomName?.toLowerCase().includes(q);
    const matchesEquip = event.equipment?.some(
      (eq) =>
        eq.name?.toLowerCase().includes(q) ||
        eq.unitLabel?.toLowerCase().includes(q) ||
        eq.unitId?.toLowerCase().includes(q),
    );
    const matchesMat = event.materials?.some((mat) =>
      mat.name?.toLowerCase().includes(q),
    );

    if (
      !matchesActor &&
      !matchesTitle &&
      !matchesPurpose &&
      !matchesCode &&
      !matchesSupervisor &&
      !matchesRoom &&
      !matchesEquip &&
      !matchesMat
    ) {
      return false;
    }
  }

  return true;
}

const statusFilterTabs: { id: StatusFilterOption; label: string }[] = [
  { id: "ALL", label: "Semua" },
  { id: "ACTIVE", label: "Sedang Aktif" },
  { id: "READY_FOR_PICKUP", label: "Siap Diambil" },
  { id: "APPROVED", label: "Disetujui" },
  { id: "OVERDUE", label: "Terlambat" },
  { id: "COMPLETED", label: "Selesai" },
];

function statusToTone(status: RequestStatus): "yellow" | "green" | "neutral" | "rose" | "dark" {
  switch (status) {
    case "APPROVED":
    case "CONFIRMED":
      return "green";
    case "ACTIVE":
    case "READY_FOR_PICKUP":
      return "yellow";
    case "OVERDUE":
    case "REJECTED":
      return "rose";
    case "COMPLETED":
    case "RETURNED":
      return "neutral";
    default:
      return "dark";
  }
}

function formatDateIndo(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function calculateDays(startAt: string, endAt: string) {
  try {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

function eventInMonth(
  event: ScheduleEvent,
  targetMonth: { year: number; month: number },
) {
  let start: Date;
  let end: Date;
  if (event.startAt) {
    try {
      start = parseJakartaDate(event.startAt);
    } catch {
      start = new Date(targetMonth.year, targetMonth.month, Math.min(event.startDay, event.endDay));
    }
  } else {
    start = new Date(targetMonth.year, targetMonth.month, Math.min(event.startDay, event.endDay));
  }

  if (event.endAt) {
    try {
      end = parseJakartaDate(event.endAt);
    } catch {
      end = new Date(targetMonth.year, targetMonth.month, Math.max(event.startDay, event.endDay));
    }
  } else {
    end = new Date(targetMonth.year, targetMonth.month, Math.max(event.startDay, event.endDay));
  }

  const targetStart = new Date(targetMonth.year, targetMonth.month, 1, 0, 0, 0, 0);
  const targetEnd = new Date(
    targetMonth.year,
    targetMonth.month + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return start <= targetEnd && endOfDay >= targetStart;
}

export function ScheduleEventHistory({
  events,
  currentRoomCode,
  currentRoomName,
  month,
  search: controlledSearch,
  onSearchChange,
  selectedStatus: controlledStatus,
  onStatusChange,
}: {
  events: ScheduleEvent[];
  currentRoomCode?: string;
  currentRoomName?: string;
  month: { year: number; month: number };
  search?: string;
  onSearchChange?: (search: string) => void;
  selectedStatus?: StatusFilterOption;
  onStatusChange?: (status: StatusFilterOption) => void;
}) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalStatus, setInternalStatus] = useState<StatusFilterOption>("ALL");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const searchInputId = useId();

  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;
  const selectedStatus = controlledStatus !== undefined ? controlledStatus : internalStatus;
  const setSelectedStatus = onStatusChange ?? setInternalStatus;

  // Strict month filtering: only show events that occur in the selected month
  const monthFilteredEvents = useMemo(() => {
    return events.filter((event) => eventInMonth(event, month));
  }, [events, month]);

  const filteredEvents = useMemo(() => {
    return monthFilteredEvents.filter((event) =>
      matchesScheduleEvent(event, selectedStatus, search, currentRoomCode),
    );
  }, [monthFilteredEvents, currentRoomCode, selectedStatus, search]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const periodSlug = `${monthName(month.month).toLowerCase()}_${month.year}`;
    const roomSlug = currentRoomCode ? `_${currentRoomCode}` : "";
    try {
      await exportElementToPdf("schedule-history-printable", {
        filename: `laporan_jadwal_lab${roomSlug}_${periodSlug}.pdf`,
        orientation: "landscape",
      });
    } catch (err) {
      console.error("Gagal mengunduh PDF:", err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      "No",
      "Kode Permohonan",
      "Judul Penelitian",
      "Peminjam",
      "Dosen Pembimbing",
      "Ruangan",
      "Instrumen & Alat",
      "Bahan Kimia",
      "Waktu Mulai",
      "Waktu Selesai",
      "Durasi (Hari)",
      "Status",
      "Keperluan",
    ];

    const rows = filteredEvents.map((evt, idx) => {
      const equipStr = (evt.equipment || [])
        .map((eq) => `${eq.name} (${eq.unitLabel || eq.unitId})`)
        .join("; ");
      const matStr = (evt.materials || [])
        .map((m) => `${m.name} ${m.quantity} ${m.unit}`)
        .join("; ");
      const days = calculateDays(evt.startAt, evt.endAt);

      return [
        idx + 1,
        `"${evt.requestCode || "-"}"`,
        `"${(evt.title || "").replace(/"/g, '""')}"`,
        `"${(evt.actor || "").replace(/"/g, '""')}"`,
        `"${(evt.supervisor || "-").replace(/"/g, '""')}"`,
        `"${(evt.roomName || "-").replace(/"/g, '""')}"`,
        `"${equipStr.replace(/"/g, '""')}"`,
        `"${matStr.replace(/"/g, '""')}"`,
        `"${formatDateIndo(evt.startAt)}"`,
        `"${formatDateIndo(evt.endAt)}"`,
        days,
        `"${requestStatusLabels[evt.status] || evt.status}"`,
        `"${(evt.purpose || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const periodName = `${monthName(month.month)}_${month.year}`;
    const roomSlug = currentRoomCode ? `_${currentRoomCode}` : "";
    link.href = url;
    link.setAttribute("download", `laporan_jadwal_lab${roomSlug}_${periodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const periodLabel = `${monthName(month.month)} ${month.year}`;
  const roomDisplay = currentRoomName || "Semua Ruangan Lab";

  return (
    <section className="mt-8 space-y-4" aria-label="Riwayat & Agenda Peminjaman Ruangan">
      {/* Optimized Print CSS Header */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          aside, header, nav, .print-hidden, .pdf-hidden {
            display: none !important;
          }
          .pdf-only {
            display: block !important;
          }
          div.pdf-only.grid, .pdf-signature-block {
            display: grid !important;
          }
          #schedule-history-printable {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: #212121 !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: calc(100vh - 20mm) !important;
          }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; table-layout: auto !important; }
          thead { display: table-header-group !important; }
          tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          th, td { word-break: break-word !important; }
          .pdf-signature-block {
            margin-top: auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: auto;
          }
        }
      `}</style>

      {/* Main Container */}
      <div
        id="schedule-history-printable"
        className="rounded-2xl border border-[#E1E1E1] bg-white p-5 sm:p-6 shadow-2xs"
      >
        {/* Clean Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="size-2 rounded-full bg-[#F9B129]" aria-hidden="true" />
              <h2 className="text-[16px] font-bold text-[#212121]">
                Riwayat & Agenda Peminjaman
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF1CC] px-2 py-0.5 text-[11px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
                <Calendar className="size-3" aria-hidden="true" />
                {periodLabel}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#6B6B6B]">
              Fasilitas: <strong className="font-semibold text-[#212121]">{roomDisplay}</strong> · {filteredEvents.length} permohonan terjadwal pada bulan ini.
            </p>
          </div>

          {/* Action Buttons: PDF Download, CSV, Print */}
          <div className="flex flex-wrap items-center gap-2 print-hidden">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#212121] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#333333] cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#F9B129] disabled:opacity-60"
              title="Unduh laporan jadwal langsung sebagai file PDF"
            >
              {downloadingPdf ? (
                <Loader2 className="size-3.5 animate-spin text-[#F9B129]" aria-hidden="true" />
              ) : (
                <FileDown className="size-3.5 text-[#F9B129]" aria-hidden="true" />
              )}
              <span>{downloadingPdf ? "Menyiapkan PDF..." : "Unduh PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#212121] transition hover:bg-[#F5F5F5] hover:border-[#212121]/30 cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#F9B129]"
            >
              <Download className="size-3.5 text-[#6B6B6B]" aria-hidden="true" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6B6B6B] transition hover:bg-[#F5F5F5] hover:text-[#212121] cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#F9B129]"
              title="Buka dialog cetak printer"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Clean Filter Toolbar (Hidden on Print) */}
        <div className="print-hidden pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {statusFilterTabs.map((tab) => {
              const active = selectedStatus === tab.id;
              const count =
                tab.id === "ALL"
                  ? monthFilteredEvents.length
                  : monthFilteredEvents.filter((e) => e.status === tab.id).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer shrink-0",
                    active
                      ? "bg-[#212121] text-white font-semibold"
                      : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EAEAEA] hover:text-[#212121]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                      active ? "bg-white/20 text-white" : "bg-[#E1E1E1] text-[#212121]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Search Input */}
          <div className="relative min-w-[240px] md:max-w-xs w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#929292]" />
            <input
              id={searchInputId}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari peminjam, permohonan, alat..."
              className="w-full rounded-lg border border-[#E1E1E1] bg-[#FAFAFA] pl-8 pr-3 py-1.5 text-[12px] text-[#212121] placeholder-[#929292] transition focus:bg-white focus:border-[#F9B129] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6B6B6B] hover:text-[#212121]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Refined, Scannable Table */}
        <div className="overflow-x-auto rounded-xl border border-[#EEEEEE]">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#EEEEEE] bg-[#FBFBFA] text-[11px] font-semibold text-[#6B6B6B]">
                <th scope="col" className="px-3.5 py-2.5 w-10 text-center">
                  No
                </th>
                <th scope="col" className="px-3.5 py-2.5 min-w-[220px]">
                  Permohonan & Penelitian
                </th>
                <th scope="col" className="px-3.5 py-2.5 min-w-[150px]">
                  Peminjam
                </th>
                <th scope="col" className="px-3.5 py-2.5 min-w-[200px]">
                  Fasilitas & Bahan
                </th>
                <th scope="col" className="px-3.5 py-2.5 min-w-[150px]">
                  Jadwal & Durasi
                </th>
                <th scope="col" className="px-3.5 py-2.5 min-w-[110px]">
                  Status
                </th>
                <th scope="col" className="px-3.5 py-2.5 w-16 text-right print-hidden">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#6B6B6B]">
                    <div className="mx-auto max-w-sm space-y-1">
                      <p className="font-semibold text-[13px] text-[#212121]">
                        Tidak ada riwayat permohonan
                      </p>
                      <p className="text-[12px]">
                        {search
                          ? "Tidak ditemukan data yang cocok dengan pencarian."
                          : `Belum ada agenda peminjaman tercatat pada bulan ${periodLabel}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt, idx) => {
                  const days = calculateDays(evt.startAt, evt.endAt);
                  const tone = statusToTone(evt.status);
                  const reqUrl = evt.requestId ? `/plp/requests/${evt.requestId}` : null;
                  const equipCount = evt.equipment?.length || 0;
                  const primaryEquip = evt.equipment?.[0];
                  const matCount = evt.materials?.length || 0;
                  const primaryMat = evt.materials?.[0];

                  return (
                    <tr
                      key={evt.id}
                      className={cn(
                        "transition hover:bg-[#FAFAF8]",
                        evt.status === "OVERDUE" && "bg-[#FDE9E9]/20",
                      )}
                    >
                      {/* No */}
                      <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-[#6B6B6B] tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Request & Title */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-[#AE7C1D]">
                              {evt.requestCode || "-"}
                            </span>
                            {evt.roomName && (
                              <span className="rounded bg-[#F5F5F5] px-1.5 py-0.2 text-[10px] font-medium text-[#6B6B6B]">
                                {evt.roomName}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-[#212121] leading-snug">
                            {evt.title}
                          </p>
                          {evt.purpose && (
                            <p className="text-[11px] text-[#6B6B6B] line-clamp-1">
                              {evt.purpose}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Borrower */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[#212121] font-medium">
                            <User className="size-3 text-[#6B6B6B] shrink-0" aria-hidden="true" />
                            <span>{evt.actor}</span>
                          </div>
                          {evt.supervisor && (
                            <p className="text-[11px] text-[#6B6B6B]">
                              Dosen: {evt.supervisor}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Equipment & Materials - Compact on Web, Explicit Full List on PDF/Print */}
                      <td className="px-3.5 py-2.5">
                        {/* Web View (Compact with +X badges) */}
                        <div className="pdf-hidden print:hidden space-y-1">
                          {primaryEquip ? (
                            <div className="text-[11px] text-[#212121]">
                              <span className="font-medium">{primaryEquip.name}</span>{" "}
                              <span className="font-mono text-[10px] text-[#6B6B6B]">
                                [{primaryEquip.unitLabel || primaryEquip.unitId}]
                              </span>
                              {equipCount > 1 && (
                                <span className="ml-1 text-[10px] text-[#AE7C1D] font-medium">
                                  +{equipCount - 1} alat lain
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#929292] italic">
                              Hanya pemakaian ruangan
                            </span>
                          )}

                          {primaryMat && (
                            <div className="text-[11px] text-[#38529B]">
                              <span>{primaryMat.name}</span>{" "}
                              <span className="font-mono text-[10px] font-semibold">
                                ({primaryMat.quantity} {primaryMat.unit})
                              </span>
                              {matCount > 1 && (
                                <span className="ml-1 text-[10px] font-medium">
                                  +{matCount - 1} bahan
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* PDF & Print View (Explicit Full Listing Without Truncation) */}
                        <div className="hidden pdf-only print:block space-y-1.5">
                          {evt.equipment && evt.equipment.length > 0 ? (
                            <div className="space-y-0.5">
                              {evt.equipment.map((eq, eqIdx) => (
                                <div key={eqIdx} className="text-[10px] text-[#212121] leading-tight">
                                  <span className="font-medium">• {eq.name}</span>{" "}
                                  <span className="font-mono text-[9px] text-[#6B6B6B]">
                                    [{eq.unitLabel || eq.unitId}]
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#929292] italic">
                              Hanya pemakaian ruangan
                            </span>
                          )}

                          {evt.materials && evt.materials.length > 0 && (
                            <div className="space-y-0.5 pt-0.5 border-t border-[#EEEEEE]/70">
                              {evt.materials.map((mat, matIdx) => (
                                <div key={matIdx} className="text-[10px] text-[#38529B] leading-tight">
                                  <span>• {mat.name}</span>{" "}
                                  <span className="font-mono text-[9px] font-semibold">
                                    ({mat.quantity} {mat.unit})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dates & Duration */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[#212121] font-medium text-[11px]">
                            <Clock className="size-3 text-[#AE7C1D] shrink-0" aria-hidden="true" />
                            <span className="tabular-nums">
                              {formatDateShort(evt.startAt)} – {formatDateShort(evt.endAt)}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#6B6B6B]">
                            {days} hari peminjaman
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5">
                        <StatusBadge tone={tone}>
                          {requestStatusLabels[evt.status] || evt.status}
                        </StatusBadge>
                        {evt.status === "OVERDUE" && (
                          <span className="block mt-0.5 text-[10px] font-bold text-[#DC2626]">
                            Belum kembali
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right print-hidden">
                        {reqUrl ? (
                          <Link
                            href={reqUrl}
                            className="inline-flex items-center gap-0.5 rounded-lg border border-[#E1E1E1] bg-white px-2 py-1 text-[11px] font-semibold text-[#212121] transition hover:bg-[#FEF1CC] hover:border-[#F9B129] hover:text-[#AE7C1D]"
                          >
                            <span>Detail</span>
                            <ArrowUpRight className="size-3" aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-[#929292]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Signature Footer (Appears on Printed PDF) */}
        <div
          data-pdf-signature="true"
          className="hidden pdf-only grid grid-cols-2 print:grid gap-12 pt-8 mt-6 border-t border-[#212121] text-[11px] text-[#212121] pdf-signature-block"
        >
          <div>
            <p className="font-semibold">Dibuat Oleh:</p>
            <p className="text-[#6B6B6B]">Pranata Laboratorium Pendidikan (PLP)</p>
            <div className="mt-12 border-t border-dashed border-[#212121] pt-1 font-medium">
              Nama & Tanda Tangan Operator
            </div>
          </div>
          <div>
            <p className="font-semibold">Mengetahui:</p>
            <p className="text-[#6B6B6B]">Koordinator Laboratorium / Kepala Lab</p>
            <div className="mt-12 border-t border-dashed border-[#212121] pt-1 font-medium">
              Nama & NIP / Tanda Tangan
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
