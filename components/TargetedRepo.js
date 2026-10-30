import { clearTarget } from "@/app/actions";

export function TargetedRepo({ target }) {
  if (!target) {
    return (
      <section className="rounded-xl border border-dashed border-black/10 px-4 py-5 dark:border-white/15">
        <p className="text-sm font-medium">Targeted repository</p>
        <p className="mt-1 text-sm text-zinc-500">
          Select a repository below to mark it as the target.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-5 dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Targeted repository</p>
          <a
            href={target.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate font-semibold hover:underline"
          >
            {target.fullName}
          </a>
          <p className="mt-1 text-sm capitalize text-zinc-500">
            {target.provider} · {target.private ? "Private" : "Public"}
          </p>
        </div>
        <form action={clearTarget}>
          <button
            type="submit"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-white dark:border-white/15 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        </form>
      </div>
    </section>
  );
}
