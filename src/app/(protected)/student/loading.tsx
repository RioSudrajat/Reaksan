export default function StudentLoading() {
  return (
    <div className="dashboard-shell min-h-screen">
      <div className="min-h-screen lg:pl-[256px]">
        <div className="h-[72px] border-b border-[#E1E1E1] bg-[#F5F5F5]" />
        <main
          className="mx-auto max-w-[1680px] px-4 pb-10 pt-6 sm:px-6 lg:px-8"
          aria-busy="true"
          aria-label="Loading workspace"
        >
          <div className="h-8 w-64 animate-pulse rounded-lg bg-[#E1E1E1]" />
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <div className="h-[280px] animate-pulse rounded-2xl bg-white" />
            <div className="h-[280px] animate-pulse rounded-2xl bg-white" />
          </div>
        </main>
      </div>
    </div>
  );
}
