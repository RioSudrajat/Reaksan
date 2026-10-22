"use client";

import Link from "next/link";
import { ArrowRight, DoorOpen, Search, UserCheck } from "lucide-react";
import { StatusBadge, type Room } from "@/components/reaksan-dashboard";
import { LabCardIllustration } from "@/components/illustrations/lab-card-illustrations";

export const PLP_NAME_BY_ROOM: Record<string, string> = {
  "lab-organik": "PLP Lab Organik",
  "lab-anorganik": "PLP Lab Anorganik",
  "lab-biokimia": "PLP Lab Biokimia",
  "lab-analitik": "PLP Lab Analitik",
  "lab-fisik": "PLP Lab Fisik",
};

export function getPlpInCharge(roomId: string, shortName: string): string {
  if (PLP_NAME_BY_ROOM[roomId]) {
    return PLP_NAME_BY_ROOM[roomId];
  }
  return `PLP Lab ${shortName}`;
}

export function StudentMobileLabView({
  rooms,
  searchTerm,
  onSearchChange,
}: {
  rooms: Room[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) {
  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      room.name.toLowerCase().includes(q) ||
      room.shortName.toLowerCase().includes(q) ||
      room.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8D6500]">
            Departemen Kimia FMIPA Unpad
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-[#1E293B] tracking-tight">
            Laboratorium Riset & Praktikum
          </h2>
          <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
            Pilih ruangan laboratorium di bawah untuk melihat agenda kegiatan dan mengajukan reservasi instrumen.
          </p>
        </div>

        {/* Search Input on Mobile */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama laboratorium..."
            className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#1E293B] outline-none placeholder:text-[#94A3B8] transition focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
          />
        </div>
      </div>

      {/* Lab Cards Container with Signature .map-grid background texture */}
      <div className="map-grid p-3.5 sm:p-5 rounded-2xl border border-[#E8D9BD] shadow-2xs space-y-4">
        {filteredRooms.length === 0 ? (
          <div className="rounded-xl bg-white/90 p-6 text-center border border-[#E1E1E1]">
            <DoorOpen className="size-8 mx-auto text-[#94A3B8]" />
            <p className="mt-2 text-sm font-semibold text-[#1E293B]">
              Tidak ada laboratorium yang cocok
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Coba kata kunci lain atau kosongkan kolom pencarian.
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const plpName = getPlpInCharge(room.id, room.shortName);
            const isAvailable = room.available > 0;

            return (
              <Link
                key={room.id}
                href={`/student/laboratory/rooms/${room.id}`}
                className="group block rounded-2xl bg-white border border-[#E1E1E1] shadow-2xs hover:shadow-md hover:border-[#F9B129] transition-all overflow-hidden active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9B129]"
                aria-label={`Buka jadwal ${room.name}`}
              >
                {/* Visual Banner: Chemical Laboratory SVG Illustration */}
                <div className="relative w-full h-[145px] sm:h-[165px] bg-[#FAF7F2] border-b border-[#E1E1E1] flex items-center justify-center p-2 overflow-hidden transition-colors group-hover:bg-[#FFFDF9]">
                  <LabCardIllustration
                    labCode={room.id}
                    idPrefix={`card-${room.id}`}
                    className="w-full h-full max-h-[145px] object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>

                {/* Card Content Area */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    {/* Badge Chips */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F4F4F4] text-[#6B6B6B] border border-[#E5E5E5]">
                        <DoorOpen className="size-3" />
                        Lab Riset
                      </span>

                      <StatusBadge tone={isAvailable ? "green" : "rose"}>
                        {isAvailable ? "Tersedia" : "Penuh"}
                      </StatusBadge>
                    </div>

                    {/* Room Name */}
                    <h3 className="mt-2.5 text-[17px] font-bold text-[#1E293B] group-hover:text-[#8D6500] transition-colors leading-snug">
                      {room.name}
                    </h3>

                    {/* Short Description */}
                    <p className="mt-1 text-xs text-[#64748B] leading-relaxed line-clamp-2">
                      {room.description}
                    </p>
                  </div>

                  {/* Dedicated PLP in Charge (Replaces Equipment count) */}
                  <div className="mt-4 pt-3 border-t border-[#F1F1F1] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="size-7 rounded-lg bg-[#FEF1CC] flex items-center justify-center text-[#8D6500] shrink-0">
                        <UserCheck className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider leading-none">
                          PLP Penanggung Jawab
                        </p>
                        <p className="text-xs font-bold text-[#212121] truncate mt-0.5">
                          {plpName}
                        </p>
                      </div>
                    </div>

                    {/* Direct Room Schedule Link Action */}
                    <div className="flex items-center gap-1 text-xs font-bold text-[#F9B129] group-hover:text-[#E5A020] transition-colors shrink-0">
                      <span className="hidden sm:inline">Jadwal</span>
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
