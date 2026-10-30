"use client";

import { useMemo, useState, useTransition } from "react";
import { selectTarget } from "@/app/actions";

export function RepoList({ repos, targetId }) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return repos;
    }

    return repos.filter((repo) => {
      return (
        repo.fullName.toLowerCase().includes(needle) ||
        repo.name.toLowerCase().includes(needle) ||
        repo.description.toLowerCase().includes(needle)
      );
    });
  }, [repos, query]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="repo-search" className="text-sm font-medium">
          Repositories
        </label>
        <input
          id="repo-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-white/15 dark:bg-zinc-950"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          No repositories match that search.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {filtered.map((repo) => {
            const selected = repo.id === targetId;
            return (
              <li key={`${repo.provider}-${repo.id}`}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(() => {
                      selectTarget(repo);
                    });
                  }}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900 ${
                    selected ? "bg-zinc-50 dark:bg-zinc-900" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{repo.fullName}</span>
                    <span className="shrink-0 text-xs uppercase tracking-wide text-zinc-500">
                      {selected ? "Targeted" : repo.private ? "Private" : "Public"}
                    </span>
                  </div>
                  {repo.description ? (
                    <span className="line-clamp-2 text-sm text-zinc-500">
                      {repo.description}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
