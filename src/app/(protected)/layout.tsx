import { requireSession } from "@/lib/session";

export const runtime = "nodejs";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <main id="main-content">{children}</main>;
}
