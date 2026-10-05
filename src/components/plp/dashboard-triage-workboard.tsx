"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  PackageCheck,
  Undo2,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import {
  EmptyState,
  RequestStatusBadge,
  formatDateTime,
  formatRange,
} from "@/components/workspace";
import { UnitStatusAction } from "@/components/plp/unit-status-action";
import { cn } from "cn";

export type TriageItem = {
  id: string;
  code: string;
  title: string;
  actorName: string;
  activityTitle?: string;
  roomName: string;
  startAt: string;
  endAt?: string;
  status: string;
  overdue?: boolean;
};

export type TriageMaintenanceUnit = {
  id: string;
  code: string;
  label: string;
  status: string;
  condition: string;
  notes?: string | null;
  assetName: string;
  assetCode: string;
};

export type DashboardTriageWorkboardProps = {
  pendingList: TriageItem[];
  pendingCount: number;
  issueList: TriageItem[];
  issueCount: number;
  returnList: TriageItem[];
  returnCount: number;
  maintenanceList?: TriageMaintenanceUnit[];
  maintenanceCount?: number;
  singleRoomCode?: string;
};

type TabKey = "pending" | "issue" | "return" | "maintenance";

export function DashboardTriageWorkboard({
  pendingList,
  pendingCount,
  issueList,
  issueCount,
  returnList,
  returnCount,
  maintenanceList = [],
  maintenanceCount,
  singleRoomCode,
}: DashboardTriageWorkboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const overdueReturnCount = returnList.filter(
    (r) => r.overdue || r.status === "OVERDUE",
  ).length;

  const totalMaintenance = maintenanceCount ?? maintenanceList.length;

  const tabs: {
    key: TabKey;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    actionHref: string;
    actionLabel: string;
  }[] = [
    {
      key: "pending",
      label: "Permohonan Review",
      count: pendingCount,
      icon: Clock,
      accentColor:
        pendingCount > 0
          ? "bg-[#FEF1CC] text-[#AE7C1D] border-[#F9B129]/40"
          : "bg-[#F5F5F5] text-[#6B6B6B] border-[#E1E1E1]",
      actionHref: "/plp/requests?status=PENDING_PLP",
      actionLabel: "Lihat Semua",
    },
    {
      key: "issue",
      label: "Antrean Serah-Terima",
      count: issueCount,
      icon: PackageCheck,
      accentColor:
        issueCount > 0
          ? "bg-[#FEF1CC] text-[#AE7C1D] border-[#F9B129]/40"
          : "bg-[#F5F5F5] text-[#6B6B6B] border-[#E1E1E1]",
      actionHref: "/plp/fulfillment/issue",
      actionLabel: "Buka Antrean",
    },
    {
      key: "return",
      label: "Pengembalian",
      count: returnCount,
      icon: Undo2,
      accentColor:
        overdueReturnCount > 0
          ? "bg-white text-[#991B1B] border-[#F45959]/40"
          : returnCount > 0
            ? "bg-[#FEF1CC] text-[#AE7C1D] border-[#F9B129]/40"
            : "bg-[#F5F5F5] text-[#6B6B6B] border-[#E1E1E1]",
      actionHref: "/plp/fulfillment/return",
      actionLabel: "Buka Antrean",
    },
    {
      key: "maintenance",
      label: "Perlu Servis",
      count: totalMaintenance,
      icon: Wrench,
      accentColor:
        totalMaintenance > 0
          ? "bg-[#F5F5F5] text-[#212121] border-[#E1E1E1]"
          : "bg-[#F5F5F5] text-[#6B6B6B] border-[#E1E1E1]",
      actionHref: `/plp/inventory/equipment?status=MAINTENANCE${singleRoomCode ? `&room=${encodeURIComponent(singleRoomCode)}` : ""}`,
      actionLabel: "Katalog Servis",
    },
  ];

  const currentTabConfig = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  return (
    <div className="rounded-2xl border border-[#E1E1E1] bg-white shadow-xs overflow-hidden flex flex-col justify-between">
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E1E1E1] bg-[#F5F5F5]/70 px-4 sm:px-6 pt-3">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-semibold transition rounded-t-xl cursor-pointer",
                    isActive
                      ? "bg-white text-[#212121] shadow-xs border-t border-x border-[#E1E1E1]"
                      : "text-[#6B6B6B] hover:text-[#212121] hover:bg-white/60",
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon
                    className={cn(
                      "size-4",
                      isActive ? "text-[#AE7C1D]" : "text-[#929292]",
                    )}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold border tabular-nums",
                      tab.accentColor,
                    )}
                  >
                    {tab.count}
                  </span>
                  {isActive && (
                    <span
                      className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[#F9B129]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="py-2">
            <Link
              href={currentTabConfig.actionHref}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-3 text-[11px] font-semibold text-[#212121] transition hover:bg-[#FEF1CC] hover:border-[#F9B129]/60 hover:text-[#AE7C1D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
            >
              <span>{currentTabConfig.actionLabel}</span>
              <ArrowRight className="size-3 text-[#929292]" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Tab Panels */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col" role="tabpanel">
          {/* Tab 1: Permohonan Review */}
          {activeTab === "pending" && (
            <div>
              {pendingList.length === 0 ? (
                <EmptyState
                  title="Semua Permohonan Telah Ditinjau"
                  description="Antrean review saat ini bersih. Permohonan praktikum atau riset baru dari mahasiswa akan muncul di sini."
                />
              ) : (
                <ul className="divide-y divide-[#E1E1E1]">
                  {pendingList.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/plp/requests/${request.id}`}
                        className="group flex flex-col gap-3 rounded-xl p-3.5 transition hover:bg-[#F5F5F5] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEF1CC] text-[12px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
                            {request.actorName.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#6B6B6B]">
                                {request.code}
                              </span>
                              <span className="text-[11px] text-[#929292]">·</span>
                              <span className="text-[12px] font-semibold text-[#212121]">
                                {request.actorName}
                              </span>
                              {request.activityTitle && (
                                <>
                                  <span className="text-[11px] text-[#929292]">·</span>
                                  <span className="truncate text-[11px] text-[#6B6B6B]">
                                    {request.activityTitle}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] font-semibold text-[#212121] group-hover:text-[#AE7C1D] transition-colors">
                              {request.title}
                            </p>
                            <p className="mt-1 text-[11px] text-[#6B6B6B] tabular-nums">
                              {request.roomName} ·{" "}
                              {request.endAt
                                ? formatRange(request.startAt, request.endAt)
                                : formatDateTime(request.startAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <RequestStatusBadge status={request.status} />
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#E1E1E1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#212121] shadow-2xs transition group-hover:border-[#F9B129]/60 group-hover:bg-[#FEF1CC] group-hover:text-[#AE7C1D]">
                            Tinjau Permohonan <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tab 2: Antrean Serah Terima (Issue Queue) */}
          {activeTab === "issue" && (
            <div>
              {issueList.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Jadwal Serah-Terima Hari Ini"
                  description="Permohonan yang telah disetujui dan siap diambil mahasiswa akan ditampilkan di sini."
                />
              ) : (
                <ul className="divide-y divide-[#E1E1E1]">
                  {issueList.map((request) => (
                    <li key={request.id}>
                      <div className="group flex flex-col gap-3 rounded-xl p-3.5 transition hover:bg-[#F5F5F5] sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEF1CC] text-[12px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
                            {request.actorName.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#6B6B6B]">
                                {request.code}
                              </span>
                              <span className="text-[11px] text-[#929292]">·</span>
                              <span className="text-[12px] font-semibold text-[#212121]">
                                {request.actorName}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] font-semibold text-[#212121]">
                              {request.title}
                            </p>
                            <p className="mt-1 text-[11px] text-[#6B6B6B] tabular-nums">
                              {request.roomName} · Jadwal: {formatDateTime(request.startAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <RequestStatusBadge status={request.status} />
                          <Link
                            href="/plp/fulfillment/issue"
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#E1E1E1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#212121] shadow-2xs transition hover:bg-[#FEF1CC] hover:border-[#F9B129]/60 hover:text-[#AE7C1D]"
                          >
                            <PackageCheck className="size-3.5 text-[#AE7C1D]" />
                            <span>Serahkan Alat</span>
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tab 3: Pengembalian & Inspeksi (Return Queue) */}
          {activeTab === "return" && (
            <div>
              {returnList.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Antrean Pengembalian"
                  description="Semua alat yang sedang dipinjam masih dalam batas waktu normal atau telah diterima kembali."
                />
              ) : (
                <ul className="divide-y divide-[#E1E1E1]">
                  {returnList.map((request) => {
                    const isOverdue =
                      request.overdue || request.status === "OVERDUE";

                    return (
                      <li key={request.id}>
                        <div
                          className={cn(
                            "group flex flex-col gap-3 rounded-xl p-3.5 transition sm:flex-row sm:items-center sm:justify-between",
                            isOverdue
                              ? "bg-white border border-[#F45959]/30 hover:border-[#F45959]"
                              : "hover:bg-[#F5F5F5]",
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold border",
                                isOverdue
                                  ? "bg-[#F5F5F5] text-[#991B1B] border-[#F45959]/40"
                                  : "bg-[#FEF1CC] text-[#AE7C1D] border-[#F9B129]/30",
                              )}
                            >
                              {request.actorName.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-[#6B6B6B]">
                                  {request.code}
                                </span>
                                <span className="text-[11px] text-[#929292]">·</span>
                                <span className="text-[12px] font-semibold text-[#212121]">
                                  {request.actorName}
                                </span>
                                {isOverdue && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-[#F45959]/40 bg-white px-2 py-0.5 text-[10px] font-bold text-[#991B1B]">
                                    <AlertTriangle className="size-3 text-[#F45959]" />
                                    Terlambat
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[13px] font-semibold text-[#212121]">
                                {request.title}
                              </p>
                              <p className="mt-1 text-[11px] text-[#6B6B6B] tabular-nums">
                                Ruang: {request.roomName} · Tenggat:{" "}
                                {request.endAt
                                  ? formatDateTime(request.endAt)
                                  : "-"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <RequestStatusBadge status={request.status} />
                            <Link
                              href="/plp/fulfillment/return"
                              className={cn(
                                "inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition shadow-2xs",
                                isOverdue
                                  ? "border-[#F45959] bg-white text-[#991B1B] hover:bg-[#F5F5F5]"
                                  : "border-[#E1E1E1] bg-white text-[#212121] hover:bg-[#FEF1CC] hover:border-[#F9B129]/60 hover:text-[#AE7C1D]",
                              )}
                            >
                              <Undo2 className="size-3.5" />
                              <span>Inspeksi & Terima</span>
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Tab 4: Unit Perlu Servis (Maintenance) */}
          {activeTab === "maintenance" && (
            <div>
              {maintenanceList.length === 0 ? (
                <EmptyState
                  title="Semua Unit Siap Operasional"
                  description="Tidak ada alat atau instrumen laboratorium yang membutuhkan perbaikan saat ini."
                />
              ) : (
                <ul className="divide-y divide-[#E1E1E1]">
                  {maintenanceList.map((unit) => (
                    <li key={unit.id}>
                      <div className="group flex flex-col gap-3 rounded-xl p-3.5 transition hover:bg-[#F5F5F5] sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEF1CC] text-[12px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
                            <Wrench className="size-4 text-[#AE7C1D]" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#6B6B6B] bg-white px-1.5 py-0.5 rounded border border-[#E1E1E1]">
                                {unit.code}
                              </span>
                              <span className="text-[11px] text-[#929292]">·</span>
                              <span className="text-[12px] font-semibold text-[#212121]">
                                {unit.assetName}
                              </span>
                              <span className="text-[10px] font-semibold text-[#991B1B] bg-white px-2 py-0.5 rounded border border-[#E1E1E1]">
                                Kondisi: {unit.condition}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] text-[#6B6B6B]">
                              {unit.notes || "Dalam antrean perbaikan / kalibrasi berkala"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <UnitStatusAction
                            unit={{
                              id: unit.id,
                              code: unit.code,
                              label: unit.label,
                              status: unit.status,
                              condition: unit.condition,
                              notes: unit.notes,
                            }}
                            variant="quick-available"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Operational Bar */}
      <div className="border-t border-[#E1E1E1] bg-[#F5F5F5]/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B6B6B]">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-[#048444]" />
          <span>Triage operasional laboratorium aktif</span>
        </div>
        <Link
          href="/plp/requests"
          className="font-semibold text-[#AE7C1D] hover:underline inline-flex items-center gap-1 text-[11px]"
        >
          <span>Buka Semua Berkas Permohonan</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
