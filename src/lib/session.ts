import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Permissions } from "@/lib/permissions";
import { userHasPermission } from "@/services/permissions.service";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

// Use at the data boundary too: a layout alone doesn't protect actions or APIs.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

// Reads the stored role and the editable role permissions, so a change takes
// effect on the next request instead of when the session expires.
export async function hasPermission(userId: string, permissions: Permissions) {
  return userHasPermission(userId, permissions);
}

// Page and Server Action guard. Renders not-found rather than a "forbidden"
// screen so a signed-in user cannot map out the routes they lack access to.
export async function requirePermission(permissions: Permissions) {
  const session = await requireSession();
  if (!(await hasPermission(session.user.id, permissions))) {
    const role = (session.user.role ?? "").split(",").map((s) => s.trim());
    if (role.includes("admin")) redirect("/admin/dashboard");
    if (role.includes("plp")) redirect("/plp/dashboard");
    redirect("/student");
  }
  return session;
}
