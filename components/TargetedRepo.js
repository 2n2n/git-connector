"use client";

import { useState, useTransition } from "react";
import {
  clearTarget,
  createProjectManager,
  selectBranch,
} from "@/app/actions";

export function TargetedRepo({
  target,
  branches = [],
  selectedBranch = "",
  projectManager = null,
  projectManagerError = null,
}) {
  const [branchPending, startBranchTransition] = useTransition();
  const [createPending, startCreateTransition] = useTransition();
  const [createError, setCreateError] = useState(null);

  const branchNames = new Set(branches);
  if (selectedBranch) {
    branchNames.add(selectedBranch);
  }
  if (target?.defaultBranch) {
    branchNames.add(target.defaultBranch);
  }
  const branchOptions = Array.from(branchNames);

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

  function onBranchChange(event) {
    const nextBranch = event.target.value;
    setCreateError(null);
    startBranchTransition(() => {
      selectBranch(nextBranch);
    });
  }

  function onCreate() {
    setCreateError(null);
    startCreateTransition(async () => {
      const result = await createProjectManager(selectedBranch);
      if (!result?.ok) {
        setCreateError(result?.error || "Could not create PROJECT_MANAGER.md");
      }
    });
  }

  const pending = branchPending || createPending;
  const missingFile =
    !projectManagerError && projectManager?.checked && !projectManager.exists;
  const foundFile =
    !projectManagerError && projectManager?.checked && projectManager.exists;

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

      <div className="mt-4 flex flex-col gap-1">
        <label htmlFor="target-branch" className="text-sm font-medium">
          Branch
        </label>
        {branchOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            This repository has no branches yet.
          </p>
        ) : (
          <select
            id="target-branch"
            value={selectedBranch}
            disabled={pending}
            onChange={onBranchChange}
            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60 dark:border-white/15 dark:bg-zinc-950"
          >
            {branchOptions.map((name) => (
              <option key={name} value={name}>
                {name}
                {name === target.defaultBranch ? " (default)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {projectManagerError ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {projectManagerError}
        </p>
      ) : null}

      {foundFile ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          PROJECT_MANAGER.md is on {selectedBranch}.
        </p>
      ) : null}

      {missingFile ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>
            This repository doesn&apos;t have a PROJECT_MANAGER.md file
            {selectedBranch ? ` on ${selectedBranch}` : ""}.
          </p>
          <button
            type="button"
            disabled={pending || !selectedBranch}
            onClick={onCreate}
            className="mt-3 rounded-lg bg-amber-800 px-3 py-1.5 text-sm text-white hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
          >
            {createPending ? "Creating…" : "Create PROJECT_MANAGER.md"}
          </button>
        </div>
      ) : null}

      {createError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {createError}
        </p>
      ) : null}
    </section>
  );
}
