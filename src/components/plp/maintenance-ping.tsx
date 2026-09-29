"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/student-api";

// Runs the lazy automation (overdue marking, reservation reminders) once when
// the PLP dashboard mounts, then refreshes if anything changed.
export function MaintenancePing() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const result = await apiRequest<{ overdue: number; reminders: number }>(
          "/api/plp/maintenance",
          { method: "POST" },
        );
        if (result.overdue > 0 || result.reminders > 0) router.refresh();
      } catch {
        // Automation is best-effort; the dashboard still renders stored data.
      }
    })();
  }, [router]);

  return null;
}
