"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search, Users } from "lucide-react";
import { formatDateTime } from "@/components/workspace";
import { UserDetailModal, type UserDetail } from "./user-detail-modal";
import { UserRoleForm } from "./user-role-form";

interface UserListProps {
  users: UserDetail[];
  currentUserId: string;
  currentRole?: string;
  currentSearch?: string;
}

export function UserList({
  users,
  currentUserId,
  currentRole = "all",
  currentSearch = "",
}: UserListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [roleFilter, setRoleFilter] = useState<string>(currentRole);

  const applyFilters = (newRole: string, newSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch && newSearch.trim()) {
      params.set("search", newSearch.trim());
    } else {
      params.delete("search");
    }
    if (newRole && newRole !== "all") {
      params.set("role", newRole);
    } else {
      params.delete("role");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/users?${qs}` : "/admin/users");
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = u.name.toLowerCase().includes(q);
    const matchEmail = u.email.toLowerCase().includes(q);
    const matchUsername = (u.username ?? "").toLowerCase().includes(q);
    return matchName || matchEmail || matchUsername;
  });

  const roleBadgeStyle = (role: string | null | undefined) => {
    switch (role) {
      case "admin":
        return {
          label: "⚙️ Admin",
          cls: "bg-amber-100 text-amber-900 border-amber-300",
        };
      case "plp":
        return {
          label: "🔬 PLP",
          cls: "bg-emerald-100 text-emerald-900 border-emerald-300",
        };
      default:
        return {
          label: "🎓 Mahasiswa",
          cls: "bg-blue-100 text-blue-900 border-blue-300",
        };
    }
  };

  return (
    <div>
      {/* SEARCH & FILTER CONTROLS */}
      <div className="p-4 border-b border-[#EEEEEE] bg-[#FAF7F2]/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters(roleFilter, searchQuery);
          }}
          className="relative flex-1 max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#929292]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => {
              if (searchQuery !== currentSearch) {
                applyFilters(roleFilter, searchQuery);
              }
            }}
            placeholder="Cari berdasarkan Nama, NIM / NIP, atau Email (tekan Enter)..."
            className="h-9.5 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-3 text-xs text-[#212121] placeholder-[#94A3B8] transition outline-none focus:border-[#F9B129] focus:ring-2 focus:ring-[#F9B129]/20"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Semua Akun" },
            { id: "user", label: "🎓 Mahasiswa" },
            { id: "plp", label: "🔬 PLP" },
            { id: "admin", label: "⚙️ Admin" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setRoleFilter(tab.id);
                applyFilters(tab.id, searchQuery);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                roleFilter === tab.id
                  ? "bg-[#212121] text-white shadow-2xs"
                  : "bg-white border border-[#E1E1E1] text-[#6B6B6B] hover:bg-[#FAF7F2] hover:text-[#212121]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* EMPTY SEARCH RESULT */}
      {filteredUsers.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="size-8 mx-auto text-[#929292] opacity-60" />
          <p className="mt-2 text-xs font-semibold text-[#212121]">
            Tidak ada pengguna yang cocok
          </p>
          <p className="text-[11px] text-[#6B6B6B] mt-0.5">
            Coba gunakan kata kunci pencarian atau filter peranan yang lain.
          </p>
        </div>
      ) : (
        /* USER ROWS */
        <ul className="divide-y divide-[#EEEEEE]">
          {filteredUsers.map((account) => {
            const roleInfo = roleBadgeStyle(account.role);
            const initials = account.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <li
                key={account.id}
                className="group flex flex-col gap-3 p-4 transition-colors hover:bg-[#FAF7F2]/60 lg:flex-row lg:items-center lg:justify-between cursor-pointer"
                onClick={() => setSelectedUser(account)}
              >
                {/* Left section: Avatar & user credentials */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="size-11 rounded-xl bg-[#FAF7F2] border border-[#E1E1E1] flex items-center justify-center font-bold text-xs text-[#212121] shrink-0 group-hover:border-[#F9B129] group-hover:bg-white transition-all shadow-2xs">
                    {initials || "U"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-bold text-[#212121] group-hover:text-[#8D6500] transition-colors">
                        {account.name}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${roleInfo.cls}`}
                      >
                        {roleInfo.label}
                      </span>
                      {account.id === currentUserId && (
                        <span className="text-[10px] bg-[#212121] text-white px-2 py-0.5 rounded-full font-semibold">
                          Anda
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B6B6B]">
                      {account.username ? (
                        <span className="font-mono font-semibold text-[#212121] bg-white border border-[#E1E1E1] px-1.5 py-0.5 rounded text-[10px]">
                          NIM/NIP: {account.username}
                        </span>
                      ) : (
                        <span className="text-[#929292] italic text-[10px]">
                          NIM/NIP belum disetel
                        </span>
                      )}
                      <span className="truncate">{account.email}</span>
                      <span className="text-[#929292] [font-variant-numeric:tabular-nums]">
                        · Terdaftar {formatDateTime(account.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right section: Action pill & Quick role form */}
                <div
                  className="flex items-center gap-2 shrink-0 self-end lg:self-center"
                  onClick={(e) => e.stopPropagation()} // Prevent double-triggering row click when interacting with form
                >
                  <button
                    type="button"
                    onClick={() => setSelectedUser(account)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[11px] font-bold text-[#212121] shadow-2xs hover:border-[#F9B129] hover:bg-[#FAF7F2] transition cursor-pointer"
                  >
                    <span>Overview Profil</span>
                    <ChevronRight className="size-3.5 text-[#929292]" />
                  </button>

                  <UserRoleForm
                    userId={account.id}
                    email={account.email}
                    currentRole={account.role ?? "user"}
                    isSelf={account.id === currentUserId}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* OVERVIEW DETAIL MODAL POPOVER */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isSelf={selectedUser.id === currentUserId}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={() => {
            // Updated in db, close or keep
          }}
        />
      )}
    </div>
  );
}
