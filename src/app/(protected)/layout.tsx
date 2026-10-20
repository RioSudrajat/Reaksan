import { requireSession } from "@/lib/session";
import { TabSessionGuard } from "@/components/tab-session-guard";

export const runtime = "nodejs";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return (
    <>
      <TabSessionGuard isProtected={true} />
      <main id="main-content">{children}</main>
    </>
  );
}
