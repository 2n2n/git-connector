export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <p className="text-sm text-zinc-500">Loading repositories…</p>
    </main>
  );
}
