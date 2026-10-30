import { Suspense } from "react";
import { redirect } from "next/navigation";
import { disconnect } from "@/app/actions";
import {
  checkProjectManagerFile,
  listBranchesForTarget,
  resolveTargetBranch,
} from "@/lib/project-manager";
import { getConnectorSession, listReposForSession } from "@/lib/repos";
import { getTarget } from "@/lib/target";
import { GitHubIcon, GitLabIcon } from "@/components/Icons";
import { RepoList } from "@/components/RepoList";
import { TargetedRepo } from "@/components/TargetedRepo";

async function Dashboard() {
  const session = await getConnectorSession();
  if (!session) {
    redirect("/");
  }

  let repos = [];
  let error = null;

  try {
    repos = await listReposForSession(session);
  } catch (err) {
    error = err.message || "Could not load repositories.";
  }

  const storedTarget = await getTarget();
  const target =
    storedTarget?.provider === session.provider ? storedTarget : null;

  const listedTarget = target
    ? repos.find((repo) => repo.id === target.id)
    : null;

  let branches = [];
  let projectManager = null;
  let projectManagerError = null;
  let branchListError = null;

  if (target) {
    try {
      branches = await listBranchesForTarget(session, target);
    } catch (err) {
      branchListError = err.message || "Could not load branches.";
    }
  }

  const selectedBranch =
    resolveTargetBranch(target, listedTarget?.defaultBranch || "") ||
    branches[0] ||
    "";

  if (target && selectedBranch) {
    try {
      projectManager = await checkProjectManagerFile(
        session,
        target,
        selectedBranch,
      );
    } catch (err) {
      projectManagerError =
        err.message || "Could not check PROJECT_MANAGER.md.";
    }
  } else if (target && branchListError) {
    projectManagerError = branchListError;
  }

  const ProviderIcon =
    session.provider === "gitlab" ? GitLabIcon : GitHubIcon;
  const providerLabel = session.provider === "gitlab" ? "GitLab" : "GitHub";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            <ProviderIcon className="h-4 w-4" />
            Connected to {providerLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {session.user.name || session.user.email || "Signed in"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {repos.length} repositor{repos.length === 1 ? "y" : "ies"} available
          </p>
        </div>
        <form action={disconnect}>
          <button
            type="submit"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-zinc-900"
          >
            Disconnect
          </button>
        </form>
      </header>

      <TargetedRepo
        target={target}
        branches={branches}
        selectedBranch={selectedBranch}
        projectManager={projectManager}
        projectManagerError={projectManagerError}
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : (
        <RepoList repos={repos} targetId={target?.id ?? null} />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <p className="text-sm text-zinc-500">Loading repositories…</p>
    </main>
  );
}
