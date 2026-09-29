import { siteConfig } from "@/config/site";

// Where to send an account after sign-in or sign-up. Roles live as a single
// name or a comma-separated list, so the most capable role wins.
export function landingPathForRole(role: string | null | undefined) {
  const roles = (role ?? "")
    .split(",")
    .map((value) => value.trim());
  if (roles.includes("admin")) return "/admin/dashboard";
  if (roles.includes("plp")) return "/plp/dashboard";
  return siteConfig.homePath;
}
