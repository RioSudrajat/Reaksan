"use client";

import { useState } from "react";
import { cn } from "cn";
import { apiRequest, errorMessage } from "@/components/student-api";
import {
  actionLabel,
  permissionGroups,
  resourceLabels,
} from "@/lib/permission-copy";
import { statement } from "@/lib/permissions";
import type { PermissionMap } from "@/lib/permissions";

export type RolePermissions = PermissionMap;

function countActions(permissions: RolePermissions) {
  return Object.values(permissions).reduce(
    (total, actions) => total + actions.length,
    0,
  );
}

export function RolePermissionEditor({
  role,
  label,
  permissions,
  defaultPermissions,
  editable,
}: {
  role: string;
  label: string;
  permissions: RolePermissions;
  defaultPermissions: RolePermissions;
  editable: boolean;
}) {
  const [draft, setDraft] = useState<RolePermissions>(permissions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const toggle = (resource: string, action: string) => {
    setDraft((current) => {
      const actions = current[resource] ?? [];
      const next = actions.includes(action)
        ? actions.filter((item) => item !== action)
        : [...actions, action];
      const updated = { ...current };
      if (next.length === 0) delete updated[resource];
      else updated[resource] = next;
      return updated;
    });
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/api/admin/roles/${role}`, {
        method: "PATCH",
        body: { permissions: draft },
      });
      setMessage({
        tone: "ok",
        text: `Izin peran ${label} tersimpan dan langsung berlaku.`,
      });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {!editable && (
        <p className="mb-3 rounded-xl bg-[#FEF1CC] px-3 py-2 text-[11px] leading-5 text-[#6B5B2E]">
          Peran administrator selalu penuh agar tidak ada yang terkunci dari
          pengelolaan akun. Peran lain bebas diatur.
        </p>
      )}
      <div className="space-y-4">
        {permissionGroups.map((group) => (
          <fieldset key={group.title}>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#929292]">
              {group.title}
            </legend>
            <div className="space-y-2">
              {group.resources.map((resource) => {
                const actions = (
                  statement as Record<string, readonly string[]>
                )[resource];
                if (!actions) return null;
                return (
                  <div
                    key={resource}
                    className="rounded-xl border border-[#EEEEEE] p-3"
                  >
                    <p className="text-[12px] font-semibold text-[#212121]">
                      {resourceLabels[resource] ?? resource}
                    </p>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {actions.map((action) => {
                        const checked = (draft[resource] ?? []).includes(action);
                        return (
                          <label
                            key={action}
                            className={cn(
                              "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-[12px]",
                              editable
                                ? "hover:bg-[#FAFAF8]"
                                : "cursor-not-allowed opacity-70",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!editable}
                              onChange={() => toggle(resource, action)}
                              className="size-4 accent-[#F9B129]"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-[#212121]">
                                {actionLabel(resource, action)}
                              </span>
                              <span className="block font-mono text-[10px] text-[#929292]">
                                {resource}.{action}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {editable && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan izin"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDraft(structuredClone(defaultPermissions));
                setMessage(null);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E1E1E1] bg-white px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
            >
              Kembalikan ke bawaan
            </button>
          </>
        )}
        <span className="text-[11px] text-[#6B6B6B]">
          {countActions(draft)} izin aktif
        </span>
      </div>
      {message && (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-[12px]",
            message.tone === "ok"
              ? "bg-[#E5F5ED] text-[#03683A]"
              : "bg-[#FDE9E9] text-[#9E3636]",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
