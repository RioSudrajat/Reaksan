import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { landingPathForRole } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSession();
    if (session) {
      redirect(landingPathForRole(session.user.role));
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      (error.digest.startsWith("NEXT_REDIRECT") ||
        error.digest === "DYNAMIC_SERVER_USAGE")
    ) {
      throw error;
    }
    console.error("AuthLayout session check error:", error);
  }
  return <>{children}</>;
}
