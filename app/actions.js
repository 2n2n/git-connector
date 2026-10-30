"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { disconnectGitAuth } from "@github-connector/auth/server";
import { auth } from "@/lib/auth";
import {
  createProjectManagerFile,
  resolveTargetBranch,
} from "@/lib/project-manager";
import { getConnectorSession } from "@/lib/repos";
import {
  clearTargetCookie,
  getTarget,
  setTargetCookie,
} from "@/lib/target";

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function disconnect() {
  await clearTargetCookie();
  await disconnectGitAuth(auth, await headers());
  redirect("/");
}

export async function selectTarget(repo) {
  await requireUser();
  const defaultBranch =
    repo?.defaultBranch != null ? String(repo.defaultBranch) : "";
  await setTargetCookie({
    ...repo,
    defaultBranch,
    branch: repo?.branch || defaultBranch,
  });
  revalidatePath("/dashboard");
}

export async function selectBranch(branch) {
  await requireUser();
  const target = await getTarget();
  if (!target) {
    throw new Error("No targeted repository");
  }

  const nextBranch = branch != null ? String(branch) : "";
  if (!nextBranch) {
    throw new Error("Select a branch");
  }

  await setTargetCookie({
    ...target,
    branch: nextBranch,
  });
  revalidatePath("/dashboard");
}

export async function clearTarget() {
  await requireUser();
  await clearTargetCookie();
  revalidatePath("/dashboard");
}

export async function createProjectManager(branch) {
  await requireUser();
  const session = await getConnectorSession();
  if (!session) {
    return { ok: false, error: "Not authenticated" };
  }

  const target = await getTarget();
  if (!target || target.provider !== session.provider) {
    return { ok: false, error: "Select a repository first." };
  }

  const passedBranch = branch != null ? String(branch).trim() : "";
  const resolvedBranch = passedBranch || resolveTargetBranch(target);

  if (!resolvedBranch) {
    return { ok: false, error: "Select a branch first." };
  }

  try {
    if (resolvedBranch !== target.branch) {
      await setTargetCookie({
        ...target,
        branch: resolvedBranch,
      });
    }

    await createProjectManagerFile(session, target, resolvedBranch);
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Could not create PROJECT_MANAGER.md",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
