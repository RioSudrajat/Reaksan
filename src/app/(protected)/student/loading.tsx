import { SkeletonBlock } from "@/components/workspace";

export default function StudentLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat workspace">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-8 w-80" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  );
}
