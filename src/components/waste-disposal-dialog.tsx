"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FlaskConical, Trash2, X } from "lucide-react";

export type AvailableContainer = {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  categoryColorHex?: string | null;
  categoryHazardBadge?: string | null;
  currentVolume: string;
  maxCapacity: string;
  unit: string;
  percentage: number;
};

export function WasteDisposalDialog({
  requestId,
  roomId,
  roomCode,
  defaultChemical = "",
  trigger,
  onSuccess,
}: {
  requestId?: string;
  roomId?: string;
  roomCode?: string;
  defaultChemical?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [containers, setContainers] = useState<AvailableContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);

  const [containerId, setContainerId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("L");
  const [chemicalDescription, setChemicalDescription] = useState(defaultChemical);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => {
    setLoadingContainers(true);
    setError(null);
    setSuccess(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const params = new URLSearchParams();
    if (roomId) params.set("roomId", roomId);
    if (roomCode) params.set("roomCode", roomCode);
    const queryString = params.toString();
    const url = queryString
      ? `/api/waste/containers/available?${queryString}`
      : "/api/waste/containers/available";

    let cancelled = false;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.data) {
          setContainers(data.data);
          if (data.data.length > 0) {
            setContainerId(data.data[0].id);
            setUnit(data.data[0].unit || "L");
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("Gagal memuat wadah limbah", err);
          setError("Gagal memuat daftar wadah limbah di laboratorium ini.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContainers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, roomId, roomCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/waste/disposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerId,
          requestId: requestId || undefined,
          quantity: Number(quantity),
          unit,
          chemicalDescription,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mencatat pembuangan limbah.");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        onSuccess?.();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContainer = containers.find((c) => c.id === containerId);

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          Catat Limbah Sisa
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Catat Limbah Sisa Praktikum (B3)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dokumentasikan pembuangan residu zat kimia ke jerigen lab.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="my-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 animate-bounce" />
                <h4 className="mt-2 text-sm font-bold text-slate-900">
                  Pembuangan Limbah Tercatat!
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Volume wadah telah diperbarui dan log menunggu verifikasi PLP.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                {loadingContainers ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Memuat wadah jerigen lab aktif...
                  </div>
                ) : containers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
                    Belum ada jerigen limbah aktif yang terdaftar di ruangan ini. Hubungi PLP lab.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Wadah / Jerigen Tujuan di Meja Lab
                      </label>
                      <select
                        required
                        value={containerId}
                        onChange={(e) => {
                          setContainerId(e.target.value);
                          const sel = containers.find((c) => c.id === e.target.value);
                          if (sel) setUnit(sel.unit || "L");
                        }}
                        className="mt-1 h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:border-slate-400 focus:outline-none"
                      >
                        {containers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.categoryName}) — Terisi: {c.percentage}%
                          </option>
                        ))}
                      </select>

                      {selectedContainer && (
                        <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Kapasitas Tersedia:</span>
                            <span className="font-semibold text-slate-900">
                              {(
                                Number(selectedContainer.maxCapacity) -
                                Number(selectedContainer.currentVolume)
                              ).toFixed(2)}{" "}
                              {selectedContainer.unit} lagi
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${selectedContainer.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Estimasi Volume Sisa
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          required
                          placeholder="Misal: 0.5"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Satuan
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={unit}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-700 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Deskripsi Zat Kimia / Sisa Reaksi
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Sisa titrasi HCl 0.1M + NaOH dan indikator pp"
                        value={chemicalDescription}
                        onChange={(e) => setChemicalDescription(e.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Misal: Larutan sudah dinetralkan sebelum dituang"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </div>

                    <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                      >
                        {submitting ? "Menyimpan..." : "Simpan Log Pembuangan"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
