"use client";

import { useState } from "react";
import { controlClass } from "@/components/workspace";

type ScopeOption = { value: string; label: string };

const scopeTypes = [
  { value: "LABORATORY", label: "Laboratory" },
  { value: "ROOM", label: "Room" },
  { value: "ACTIVITY", label: "Activity" },
] as const;

export function AssignmentScopeFields({
  laboratories,
  rooms,
  activities,
  defaultScopeType = "LABORATORY",
  defaultScopeId = "",
}: {
  laboratories: ScopeOption[];
  rooms: ScopeOption[];
  activities: ScopeOption[];
  defaultScopeType?: string;
  defaultScopeId?: string;
}) {
  const [scopeType, setScopeType] = useState(defaultScopeType);

  const scopeOptions =
    scopeType === "LABORATORY"
      ? laboratories
      : scopeType === "ROOM"
        ? rooms
        : activities;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
          Scope *
        </span>
        <select
          name="scopeType"
          required
          value={scopeType}
          onChange={(event) => setScopeType(event.target.value)}
          className={controlClass}
        >
          {scopeTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
          Data scope *
        </span>
        <select
          key={scopeType}
          name="scopeId"
          required
          defaultValue={scopeType === defaultScopeType ? defaultScopeId : ""}
          className={controlClass}
        >
          <option value="">Pilih...</option>
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-[#929292]">
          {scopeType === "ACTIVITY"
            ? "Activity dipilih dari daftar, bukan ID bebas."
            : "Laboratory dan room mengikuti kode master data."}
        </span>
      </label>
    </div>
  );
}
