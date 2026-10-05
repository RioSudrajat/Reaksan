"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { exportElementToPdf } from "@/lib/pdf-export";

export type PrintButtonProps = {
  targetId?: string;
  filename?: string;
  orientation?: "portrait" | "landscape";
  label?: string;
  showPrintOnly?: boolean;
};

export function PrintButton({
  targetId,
  filename = "dokumen-laporan.pdf",
  orientation = "landscape",
  label = "Unduh PDF",
  showPrintOnly = false,
}: PrintButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    if (!targetId) {
      window.print();
      return;
    }
    setDownloading(true);
    try {
      await exportElementToPdf(targetId, {
        filename,
        orientation,
      });
    } catch (err) {
      console.error("Gagal mengunduh PDF:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  if (showPrintOnly || !targetId) {
    return (
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-3.5 text-[12px] font-semibold text-[#212121] shadow-2xs transition hover:bg-[#F5F5F5] hover:border-[#212121]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129]"
      >
        <Printer className="size-3.5 text-[#6B6B6B]" aria-hidden="true" />
        <span>Cetak</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-xl border border-[#E1E1E1] bg-white p-0.5 shadow-2xs">
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={downloading}
        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#212121] px-3 text-[12px] font-semibold text-white transition hover:bg-[#333333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129] disabled:opacity-60 cursor-pointer"
        title="Simpan / Unduh dokumen dalam format file PDF"
      >
        {downloading ? (
          <Loader2 className="size-3.5 animate-spin text-[#F9B129]" aria-hidden="true" />
        ) : (
          <Download className="size-3.5 text-[#F9B129]" aria-hidden="true" />
        )}
        <span>{downloading ? "Menyiapkan PDF..." : label}</span>
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-[#6B6B6B] transition hover:bg-[#F5F5F5] hover:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F9B129] cursor-pointer"
        title="Buka dialog cetak printer browser"
      >
        <Printer className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Cetak</span>
      </button>
    </div>
  );
}
