"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { apiRequest, errorMessage } from "@/components/student-api";

export type DeleteConfirmButtonProps = {
  endpoint: string;
  title: string;
  description: string;
  itemName: string;
  buttonText?: string;
  buttonVariant?: "icon" | "outline" | "danger" | "table-action";
  redirectOnSuccess?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function DeleteConfirmButton({
  endpoint,
  title,
  description,
  itemName,
  buttonText = "Hapus",
  buttonVariant = "table-action",
  redirectOnSuccess,
  disabled = false,
  disabledReason,
}: DeleteConfirmButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);
    try {
      await apiRequest(endpoint, { method: "DELETE" });
      setIsOpen(false);
      if (redirectOnSuccess) {
        router.push(redirectOnSuccess);
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsPending(false);
    }
  }

  const triggerButton = (() => {
    if (buttonVariant === "icon") {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          title={disabledReason ?? title}
          aria-label={title}
          className="inline-flex size-8 items-center justify-center rounded-lg text-[#DC2626] transition hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      );
    }

    if (buttonVariant === "outline") {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          title={disabledReason ?? title}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-3 text-[12px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] hover:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {buttonText}
        </button>
      );
    }

    if (buttonVariant === "danger") {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          title={disabledReason ?? title}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {buttonText}
        </button>
      );
    }

    // Default: table-action
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        title={disabledReason ?? title}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#FCA5A5]/80 bg-white px-2.5 text-[11px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] hover:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
      >
        <Trash2 className="size-3" aria-hidden="true" />
        {buttonText}
      </button>
    );
  })();

  return (
    <>
      {triggerButton}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => !isPending && setIsOpen(false)}
              disabled={isPending}
              aria-label="Tutup dialog"
              className="absolute top-4 right-4 rounded-lg p-1 text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#121826]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#DC2626]">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="delete-dialog-title"
                  className="text-[15px] font-bold text-[#121826]"
                >
                  {title}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                  {description}
                </p>
                <div className="mt-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2 text-[12px] font-mono font-medium text-[#1E293B]">
                  {itemName}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
                <p className="font-semibold">Gagal Menghapus</p>
                <p className="mt-0.5 leading-snug">{error}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 text-[12px] font-semibold text-white shadow-xs transition hover:bg-[#B91C1C] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
