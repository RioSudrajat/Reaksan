import { SkeletonBlock } from "@/components/workspace";

export default function OpnameLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat stok opname">
      <div className="space-y-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-64" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonBlock className="h-40" />
      <SkeletonBlock className="h-72" />
    </div>
  );
}
