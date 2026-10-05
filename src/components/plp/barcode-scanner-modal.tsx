"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, QrCode, X } from "lucide-react";
import { controlClass } from "@/components/workspace";

export type BarcodeItem = {
  id?: string;
  materialBatchId?: string;
  equipmentUnitId?: string;
  materialCode?: string;
  materialName?: string;
  code?: string;
  name?: string;
  lotNumber?: string | null;
  qrCode?: string | null;
  storageLocation?: string | null;
  itemType?: "MATERIAL" | "TOOL" | "INSTRUMENT";
};

export function BarcodeScannerModal({
  items,
  onItemSelect,
}: {
  items: BarcodeItem[];
  onItemSelect: (selectedId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus text input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Handle QR/Barcode matching logic
  const processCode = useCallback(
    (code: string) => {
      const trimmed = code.trim().toLowerCase();
      if (!trimmed) return;

      const matched = items.find((item) => {
        const qr = item.qrCode?.toLowerCase();
        const c = item.code?.toLowerCase();
        const mc = item.materialCode?.toLowerCase();
        const lot = item.lotNumber?.toLowerCase();
        const bid = item.materialBatchId?.toLowerCase();
        const uid = item.equipmentUnitId?.toLowerCase();
        const id = item.id?.toLowerCase();
        const mname = item.materialName?.toLowerCase();
        const name = item.name?.toLowerCase();

        return (
          qr === trimmed ||
          c === trimmed ||
          mc === trimmed ||
          lot === trimmed ||
          bid === trimmed ||
          uid === trimmed ||
          id === trimmed ||
          (mname && mname.includes(trimmed)) ||
          (name && name.includes(trimmed))
        );
      });

      if (matched) {
        setIsSuccess(true);
        const displayName =
          matched.materialName ?? matched.name ?? matched.code ?? matched.materialCode;
        const displayCode =
          matched.qrCode ?? matched.code ?? matched.materialCode ?? matched.lotNumber;
        setMessage(`Ditemukan: ${displayName} (${displayCode})`);

        const targetId =
          matched.materialBatchId ?? matched.equipmentUnitId ?? matched.id ?? "";
        onItemSelect(targetId);

        setTimeout(() => {
          setOpen(false);
          setCameraActive(false);
          setMessage(null);
          setQuery("");
        }, 700);
      } else {
        setIsSuccess(false);
        setMessage(`Kode "${code}" tidak ditemukan pada daftar sesi ini.`);
      }
    },
    [items, onItemSelect],
  );

  // Camera video stream handling
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    async function startCamera() {
      if (!cameraActive) return;
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        if (BarcodeDetectorClass) {
          const detector = new BarcodeDetectorClass({
            formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
          });

          const scanLoop = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detectedValue = barcodes[0].rawValue;
                  processCode(detectedValue);
                  return;
                }
              } catch {
                // Ignore detection frame errors
              }
            }
            animId = requestAnimationFrame(scanLoop);
          };
          scanLoop();
        } else {
          setCameraError(
            "Deteksi otomatis kamera tidak didukung browser ini. Silakan gunakan scanner fisik atau ketik kode di bawah.",
          );
        }
      } catch {
        setCameraError(
          "Gagal mengakses kamera. Pastikan izin kamera diberikan atau gunakan input manual / USB scanner.",
        );
      }
    }

    if (cameraActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [cameraActive, processCode]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[12px] font-semibold text-[#121826] transition hover:bg-[#FEF7E6] hover:border-[#FDE68A] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
      >
        <QrCode className="size-4 text-[#8D6500]" aria-hidden="true" />
        Scan QR Code / Barcode
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scanner-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <h3
                  id="scanner-dialog-title"
                  className="flex items-center gap-2 text-[16px] font-bold text-[#121826]"
                >
                  <QrCode className="size-5 text-[#8D6500]" />
                  Akselerator Scan QR Code
                </h3>
                <p className="mt-1 text-[12px] text-[#475569]">
                  Posisikan stiker QR Code pada frame target kamera atau gunakan gun scanner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCameraActive(false);
                }}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#FEF7E6] hover:text-[#121826] transition"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Camera Viewfinder with Square QR Frame */}
            <div className="mt-4">
              {cameraActive ? (
                <div className="relative mx-auto aspect-square max-w-[280px] overflow-hidden rounded-2xl bg-black shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                  />

                  {/* 1:1 Square Reticle Overlay with 4 Corner Brackets */}
                  <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
                    {/* Top-Left Corner */}
                    <div className="absolute top-0 left-0 size-7 border-t-[3.5px] border-l-[3.5px] border-[#FDB913] rounded-tl-lg" />
                    {/* Top-Right Corner */}
                    <div className="absolute top-0 right-0 size-7 border-t-[3.5px] border-r-[3.5px] border-[#FDB913] rounded-tr-lg" />
                    {/* Bottom-Left Corner */}
                    <div className="absolute bottom-0 left-0 size-7 border-b-[3.5px] border-l-[3.5px] border-[#FDB913] rounded-bl-lg" />
                    {/* Bottom-Right Corner */}
                    <div className="absolute bottom-0 right-0 size-7 border-b-[3.5px] border-r-[3.5px] border-[#FDB913] rounded-br-lg" />

                    {/* Animated Scanning Laser */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#FDB913] to-transparent shadow-[0_0_12px_#FDB913] animate-bounce" />

                    <div className="absolute bottom-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                      Posisikan QR Code di dalam frame
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#FDE68A] bg-[#FEF7E6] p-4 text-[12px] font-semibold text-[#8D6500] transition hover:bg-[#FDF2D0]"
                >
                  <Camera className="size-4" />
                  Buka Kamera Scanner QR
                </button>
              )}

              {cameraError && (
                <p className="mt-2 text-[11px] text-[#991B1B] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                  {cameraError}
                </p>
              )}
            </div>

            {/* Input Gun Barcode / Manual */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processCode(query);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Scan Gun USB / Ketik Kode Manual
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Contoh: RK-UNT-..., RK-MAT-..., MAT-041"
                    className={controlClass}
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#121826] px-4 text-[12px] font-bold text-white hover:bg-black transition"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-[12px] font-medium border ${
                    isSuccess
                      ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                      : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                  }`}
                >
                  {isSuccess && <CheckCircle2 className="size-4" />}
                  <span>{message}</span>
                </div>
              )}
            </form>

            <div className="mt-4 border-t border-[#E5E7EB] pt-3 text-[11px] text-[#64748B]">
              💡 Tips: Mendukung scanning QR Code stiker fisik, barcode kemasan bahan, maupun pencarian teks langsung.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
