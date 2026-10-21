"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setPending(true);
    setError(false);
    try {
      await authClient.signOut();
    } catch {
      setError(true);
    } finally {
      setPending(false);
      if (typeof window !== "undefined") {
        // Hard navigation guarantees fresh session teardown
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/sign-in";
      }
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t sign out. Try again.
        </p>
      )}
      <Button onClick={signOut} disabled={pending} variant="outline" size="sm">
        <LogOut aria-hidden="true" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
