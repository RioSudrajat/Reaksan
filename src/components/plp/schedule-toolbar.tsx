"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterField, controlClass } from "@/components/workspace";

export function ScheduleToolbar({
  rooms,
  currentRoom,
  currentKind = "all",
  basePath = "/plp/schedule",
}: {
  rooms: { id: string; name: string }[];
  currentRoom?: string;
  currentKind?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const activeFilterCount = [
    currentRoom,
    currentKind !== "all" ? currentKind : "",
  ].filter(Boolean).length;

  return (
    <form
      method="get"
      action={basePath}
      className="flex w-full flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const room = (formData.get("room") as string) || "";
        const kind = (formData.get("kind") as string) || "all";
        const params = new URLSearchParams();
        if (room.trim()) params.set("room", room.trim());
        if (kind && kind !== "all") params.set("kind", kind);
        const query = params.toString();
        router.push(`${basePath}${query ? `?${query}` : ""}`);
      }}
    >
      <FilterField label="Room" className="w-full sm:w-48">
        <select
          name="room"
          defaultValue={currentRoom ?? ""}
          className={controlClass}
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
        >
          <option value="">Semua room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Jenis" className="w-full sm:w-44">
        <select
          name="kind"
          defaultValue={currentKind}
          className={controlClass}
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
        >
          <option value="all">Request + reservasi</option>
          <option value="request">Request saja</option>
          <option value="reservation">Reservasi saja</option>
        </select>
      </FilterField>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#FDB913] px-4 text-[12px] font-bold text-[#121826] shadow-xs transition hover:bg-[#EAA805] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
        >
          Terapkan filter
        </button>
        {activeFilterCount > 0 && (
          <Link
            href={basePath}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[12px] font-bold text-[#64748B] transition hover:bg-[#FEF7E6] hover:text-[#8D6500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB913]"
          >
            Hapus filter
          </Link>
        )}
      </div>
    </form>
  );
}
