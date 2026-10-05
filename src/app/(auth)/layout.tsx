import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { landingPathForRole } from "@/lib/landing";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect(landingPathForRole(session.user.role));
  }
  return <>{children}</>;
}
