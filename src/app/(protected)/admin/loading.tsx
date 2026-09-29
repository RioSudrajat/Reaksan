import { SkeletonBlock } from "@/components/workspace";

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-72" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
