"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, errorMessage } from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export function OpnameStartForm({
  rooms,
}: {
  rooms: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomCode) {
      setError("Pilih room dulu.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const session = await apiRequest<{ id: string }>("/api/plp/opname", {
        method: "POST",
        body: { roomCode, ...(notes ? { notes } : {}) },
      });
      router.push(`/plp/inventory/opname/${session.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={start} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            Room
          </span>
          <select
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            className={controlClass}
          >
            <option value="">Pilih room...</option>
            {rooms.map((room) => (
              <option key={room.code} value={room.code}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            Catatan (opsional)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Konteks hitung, misalnya opname bulanan"
            className={controlClass}
          />
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-medium text-[#DC2626]"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center rounded-lg bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913] disabled:opacity-60"
      >
        {pending ? "Menyiapkan sesi..." : "Mulai sesi hitung"}
      </button>
    </form>
  );
}
