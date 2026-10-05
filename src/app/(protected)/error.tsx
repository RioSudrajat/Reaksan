"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-[#F5D0D0] bg-white p-6"
    >
      <h1 className="text-[17px] font-semibold text-[#212121]">
        Halaman ini gagal dimuat
      </h1>
      <p className="mt-2 text-[13px] leading-6 text-[#6B6B6B]">
        Terjadi masalah saat mengambil data dari Reaksan. Data yang sudah kamu
        simpan tetap aman. Coba muat ulang bagian ini.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F9B129] px-4 text-[13px] font-semibold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#212121]"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  );
}
