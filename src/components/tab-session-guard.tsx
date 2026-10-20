"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface TabSessionGuardProps {
  isProtected?: boolean;
}

export const TAB_SESSION_KEY = "reaksan_active_tab_session";

/**
 * Ensures authentication is strictly tied to an active browser tab session.
 * If the tab was closed or the app exited, sessionStorage is cleared by the browser.
 * When a new tab/window accesses Reaksan, this guard detects that no active tab session
 * exists and immediately signs out any lingering cookie/session, enforcing re-login.
 */
export function TabSessionGuard({ isProtected = false }: TabSessionGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const isTabActive =
      typeof window !== "undefined" &&
      sessionStorage.getItem(TAB_SESSION_KEY) === "true";

    if (!isTabActive) {
      void (async () => {
        try {
          const session = await authClient.getSession();
          if (session.data) {
            await authClient.signOut();
          }
        } catch {
          // Ignore network errors
        } finally {
          if (isProtected) {
            router.replace("/sign-in");
            router.refresh();
          }
        }
      })();
    }
  }, [isProtected, router]);

  return null;
}
