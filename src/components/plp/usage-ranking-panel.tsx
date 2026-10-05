"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Wrench, FlaskConical, Beaker, ArrowUpRight } from "lucide-react";
import type { TopUsageData } from "@/services/analytics.service";

type MetricMode = "days" | "requests";
type CategoryTab = "instruments" | "tools" | "materials";

export function UsageRankingPanel({
  data,
  singleRoomCode,
}: {
  data: TopUsageData;
  currentRange?: string;
  singleRoomCode?: string;
}) {
  const [metricMode, setMetricMode] = useState<MetricMode>("days");
  const [mobileTab, setMobileTab] = useState<CategoryTab>("instruments");

  const roomQuery = singleRoomCode
    ? `&room=${encodeURIComponent(singleRoomCode)}`
    : "";

  // Sort instruments and tools based on selected metric
  const sortedInstruments = [...data.instruments].sort((a, b) =>
    metricMode === "days"
      ? b.totalDaysBorrowed - a.totalDaysBorrowed || b.totalRequests - a.totalRequests
      : b.totalRequests - a.totalRequests || b.totalDaysBorrowed - a.totalDaysBorrowed,
  );

  const sortedTools = [...data.tools].sort((a, b) =>
    metricMode === "days"
      ? b.totalDaysBorrowed - a.totalDaysBorrowed || b.totalRequests - a.totalRequests
      : b.totalRequests - a.totalRequests || b.totalDaysBorrowed - a.totalDaysBorrowed,
  );

  // Materials are ranked by request count
  const sortedMaterials = [...data.materials].sort(
    (a, b) => b.totalRequests - a.totalRequests,
  );

  const maxInstrumentVal = Math.max(
    1,
    ...sortedInstruments.map((i) =>
      metricMode === "days" ? i.totalDaysBorrowed : i.totalRequests,
    ),
  );

  const maxToolVal = Math.max(
    1,
    ...sortedTools.map((t) =>
      metricMode === "days" ? t.totalDaysBorrowed : t.totalRequests,
    ),
  );

  const maxMaterialVal = Math.max(
    1,
    ...sortedMaterials.map((m) => m.totalRequests),
  );

  return (
    <div className="rounded-2xl border border-[#E1E1E1] bg-white p-4 sm:p-5 shadow-xs">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#E1E1E1] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#212121]">
              Paling Sering Digunakan
            </h2>
            <span className="rounded-md bg-[#FEF1CC] px-2 py-0.5 text-[10px] font-bold text-[#AE7C1D] border border-[#F9B129]/30">
              {data.days} hari terakhir
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
            Intensitas pemanfaatan fasilitas lab dihitung dari durasi peminjaman dan frekuensi permohonan.
          </p>
        </div>

        {/* Toggle Mode: Hari Dipinjam vs Jumlah Request */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E1E1E1] bg-[#F5F5F5] p-1">
            <button
              type="button"
              onClick={() => setMetricMode("days")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer min-h-[32px]",
                metricMode === "days"
                  ? "bg-white text-[#212121] shadow-2xs border border-[#E1E1E1]"
                  : "text-[#6B6B6B] hover:text-[#212121]",
              )}
            >
              Hari Dipinjam
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("requests")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer min-h-[32px]",
                metricMode === "requests"
                  ? "bg-white text-[#212121] shadow-2xs border border-[#E1E1E1]"
                  : "text-[#6B6B6B] hover:text-[#212121]",
              )}
            >
              Jumlah Permohonan
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Category Tab Selector (visible on small screens) */}
      <div className="flex items-center gap-1.5 pt-3 pb-1 lg:hidden border-b border-[#E1E1E1]/60">
        <button
          type="button"
          onClick={() => setMobileTab("instruments")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold transition cursor-pointer min-h-[36px]",
            mobileTab === "instruments"
              ? "bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/40"
              : "text-[#6B6B6B] bg-[#F5F5F5] hover:bg-[#E1E1E1]",
          )}
        >
          Instrumen ({sortedInstruments.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("tools")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold transition cursor-pointer min-h-[36px]",
            mobileTab === "tools"
              ? "bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/40"
              : "text-[#6B6B6B] bg-[#F5F5F5] hover:bg-[#E1E1E1]",
          )}
        >
          Alat ({sortedTools.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("materials")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold transition cursor-pointer min-h-[36px]",
            mobileTab === "materials"
              ? "bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/40"
              : "text-[#6B6B6B] bg-[#F5F5F5] hover:bg-[#E1E1E1]",
          )}
        >
          Bahan ({sortedMaterials.length})
        </button>
      </div>

      {/* 3 Columns Grid for Desktop, Single active tab on mobile */}
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {/* Column 1: Instrumen */}
        <div
          className={cn(
            "flex flex-col",
            mobileTab !== "instruments" && "hidden lg:flex",
          )}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E1E1]">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30">
                <Wrench className="size-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-[13px] font-bold text-[#212121]">
                Instrumen
              </h3>
            </div>
            <Link
              href={`/plp/inventory/instruments?status=AVAILABLE${roomQuery}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6B6B6B] hover:text-[#AE7C1D]"
            >
              <span>Katalog</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {sortedInstruments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-4 text-center text-[12px] text-[#6B6B6B] bg-[#F5F5F5]/40 my-auto">
              Belum ada riwayat peminjaman instrumen pada periode ini.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sortedInstruments.slice(0, 5).map((item, idx) => {
                const currentVal =
                  metricMode === "days"
                    ? item.totalDaysBorrowed
                    : item.totalRequests;
                const pct = Math.round((currentVal / maxInstrumentVal) * 100);

                return (
                  <li key={item.id} className="group">
                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#AE7C1D] size-4 rounded bg-[#FEF1CC] inline-flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#212121] truncate group-hover:text-[#AE7C1D] transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-[#212121] tabular-nums">
                        {currentVal}{" "}
                        <span className="font-normal text-[#6B6B6B]">
                          {metricMode === "days" ? "hari" : "permohonan"}
                        </span>
                      </span>
                    </div>

                    {/* Progress Bar in Unpad Yellow */}
                    <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full bg-[#F9B129] transition-all duration-300 group-hover:bg-[#AE7C1D]"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Column 2: Alat & Glassware */}
        <div
          className={cn(
            "flex flex-col",
            mobileTab !== "tools" && "hidden lg:flex",
          )}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E1E1]">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#FEF1CC] text-[#AE7C1D] border border-[#F9B129]/30">
                <Beaker className="size-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-[13px] font-bold text-[#212121]">
                Alat & Glassware
              </h3>
            </div>
            <Link
              href={`/plp/inventory/equipment?classification=TOOL${roomQuery}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6B6B6B] hover:text-[#AE7C1D]"
            >
              <span>Katalog</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {sortedTools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-4 text-center text-[12px] text-[#6B6B6B] bg-[#F5F5F5]/40 my-auto">
              Belum ada riwayat peminjaman alat pada periode ini.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sortedTools.slice(0, 5).map((item, idx) => {
                const currentVal =
                  metricMode === "days"
                    ? item.totalDaysBorrowed
                    : item.totalRequests;
                const pct = Math.round((currentVal / maxToolVal) * 100);

                return (
                  <li key={item.id} className="group">
                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#AE7C1D] size-4 rounded bg-[#FEF1CC] inline-flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#212121] truncate group-hover:text-[#AE7C1D] transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-[#212121] tabular-nums">
                        {currentVal}{" "}
                        <span className="font-normal text-[#6B6B6B]">
                          {metricMode === "days" ? "hari" : "permohonan"}
                        </span>
                      </span>
                    </div>

                    {/* Progress Bar in Soft Amber / Ochre */}
                    <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full bg-[#FCDD94] transition-all duration-300 group-hover:bg-[#F9B129]"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Column 3: Bahan Kimia & Reagen */}
        <div
          className={cn(
            "flex flex-col",
            mobileTab !== "materials" && "hidden lg:flex",
          )}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E1E1]">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#212121] border border-[#E1E1E1]">
                <FlaskConical className="size-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-[13px] font-bold text-[#212121]">
                Bahan Kimia
              </h3>
            </div>
            <Link
              href={`/plp/inventory/materials?stock=all${roomQuery}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6B6B6B] hover:text-[#AE7C1D]"
            >
              <span>Katalog</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {sortedMaterials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E1E1E1] p-4 text-center text-[12px] text-[#6B6B6B] bg-[#F5F5F5]/40 my-auto">
              Belum ada riwayat permohonan bahan pada periode ini.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sortedMaterials.slice(0, 5).map((item, idx) => {
                const pct = Math.round(
                  (item.totalRequests / maxMaterialVal) * 100,
                );

                return (
                  <li key={item.id} className="group">
                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#212121] size-4 rounded bg-[#F5F5F5] inline-flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#212121] truncate group-hover:text-[#AE7C1D] transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-bold text-[#212121] tabular-nums">
                          {item.totalRequests}{" "}
                          <span className="font-normal text-[#6B6B6B]">
                            permohonan
                          </span>
                        </span>
                        {item.totalQuantity !== undefined && item.totalQuantity > 0 && item.unit && (
                          <span className="block text-[10px] text-[#6B6B6B] tabular-nums">
                            {item.totalQuantity.toLocaleString("id-ID")} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar in Charcoal Black */}
                    <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full bg-[#212121] transition-all duration-300 group-hover:bg-[#AE7C1D]"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
