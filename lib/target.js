import { cookies } from "next/headers";

export const TARGET_COOKIE = "targeted_repo";

export function normalizeTarget(repo) {
  if (!repo || typeof repo !== "object") {
    return null;
  }

  const id = repo.id != null ? String(repo.id) : "";
  const name = repo.name != null ? String(repo.name) : "";
  const fullName = repo.fullName != null ? String(repo.fullName) : "";
  const url = repo.url != null ? String(repo.url) : "";

  if (!id || !name || !fullName || !url) {
    return null;
  }

  return {
    id,
    name,
    fullName,
    url,
    private: Boolean(repo.private),
    description: repo.description != null ? String(repo.description) : "",
    provider: repo.provider === "gitlab" ? "gitlab" : "github",
    branch: repo.branch != null ? String(repo.branch) : "",
    defaultBranch: repo.defaultBranch != null ? String(repo.defaultBranch) : "",
  };
}

export async function getTarget() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TARGET_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    return normalizeTarget(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function setTargetCookie(repo) {
  const target = normalizeTarget(repo);
  if (!target) {
    throw new Error("Invalid repository");
  }

  const cookieStore = await cookies();
  cookieStore.set(TARGET_COOKIE, JSON.stringify(target), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return target;
}

export async function clearTargetCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TARGET_COOKIE);
}
