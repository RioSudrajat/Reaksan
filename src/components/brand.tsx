import Link from "next/link";
import { ReaksanLogo } from "@/components/reaksan-logo";
import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label={`${siteConfig.name} home`}
    >
      <ReaksanLogo className="text-[22px]" />
    </Link>
  );
}
