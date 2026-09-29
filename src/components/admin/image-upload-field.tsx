"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { StudentApiError, errorMessage } from "@/components/student-api";
import { cn } from "cn";
import { MAX_IMAGE_BYTES, imageMimeTypes } from "@/validators/media";

export function ImageUploadField({
  name = "imageMediaId",
  label = "Gambar katalog",
  defaultMediaId = null,
  help = "PNG, JPEG, atau WebP. Maksimal 5 MB.",
}: {
  name?: string;
  label?: string;
  defaultMediaId?: string | null;
  help?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaId, setMediaId] = useState(defaultMediaId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // CrudForm calls form.reset() after a successful create; keep the upload
  // state in step with the empty input it leaves behind.
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setMediaId("");
      setPending(false);
      setError("");
      setStatus("");
      if (fileRef.current) fileRef.current.value = "";
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pilih file gambar dulu.");
      return;
    }
    if (
      !imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])
    ) {
      setError("Format gambar harus PNG, JPEG, atau WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setPending(true);
    setError("");
    setStatus("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        error?: { code?: string; message?: string };
      } | null;
      if (!response.ok || !body?.id) {
        throw new StudentApiError({
          status: response.status,
          code: body?.error?.code ?? "UNKNOWN",
          message: body?.error?.message ?? "Gambar gagal diunggah. Coba lagi.",
        });
      }
      setMediaId(body.id);
      setStatus("Gambar diunggah. Simpan form untuk menerapkan.");
      if (fileRef.current) fileRef.current.value = "";
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function clearImage() {
    setMediaId("");
    setStatus("Gambar dilepas. Simpan form untuk menerapkan.");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      ref={rootRef}
      className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        {mediaId ? (
          <img
            src={`/api/media/${mediaId}`}
            alt="Pratinjau gambar katalog"
            width={80}
            height={80}
            className="size-20 rounded-xl border border-[#E1E1E1] bg-white object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label="Belum ada gambar"
            className="flex size-20 items-center justify-center rounded-xl border border-dashed border-[#D9D9D9] bg-white p-1 text-center text-[10px] font-medium leading-3 text-[#929292]"
          >
            Belum ada gambar
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <label className="flex min-h-11 flex-col justify-center gap-1.5">
            <span className="sr-only">Pilih file gambar</span>
            <input
              ref={fileRef}
              type="file"
              name={`${name}-file`}
              accept={imageMimeTypes.join(",")}
              className="block w-full min-h-11 cursor-pointer rounded-xl border border-[#E1E1E1] bg-white px-3 py-2 text-[12px] text-[#6B6B6B] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F1F0EC] file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-[#212121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {pending ? "Mengunggah..." : "Unggah gambar"}
            </button>
            <button
              type="button"
              onClick={clearImage}
              disabled={!mediaId}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#9E3636] transition hover:bg-[#FDE9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]",
                !mediaId && "opacity-50",
              )}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Hapus gambar
            </button>
          </div>
          {help && <p className="text-[11px] text-[#929292]">{help}</p>}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-[#F3C7C7] bg-[#FDE9E9] px-3 py-2 text-[12px] font-medium text-[#9E3636]"
            >
              {error}
            </p>
          )}
          {status && (
            <p
              role="status"
              className="rounded-lg border border-[#BFE3CE] bg-[#E5F5ED] px-3 py-2 text-[12px] font-medium text-[#03683A]"
            >
              {status}
            </p>
          )}
        </div>
      </div>
      <input type="hidden" name={name} value={mediaId} readOnly />
    </div>
  );
}
