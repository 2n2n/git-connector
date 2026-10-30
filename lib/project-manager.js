export const PROJECT_MANAGER_FILE = "PROJECT_MANAGER.md";
export const PROJECT_MANAGER_COMMIT_MESSAGE = "Add PROJECT_MANAGER.md";
const MAX_PAGES = 5;

export const PROJECT_MANAGER_CONTENT = `# Project Manager

Use this file to track project goals, status, and next steps.

## Overview

## Current status

## Next steps
`;

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-connector",
  };
}

function gitlabHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "github-connector",
  };
}

function nextLinkFromHeader(header) {
  if (!header) {
    return null;
  }

  const part = header
    .split(",")
    .map((item) => item.trim())
    .find((item) => item.includes('rel="next"'));

  if (!part) {
    return null;
  }

  const match = part.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

function splitGitHubFullName(fullName) {
  const parts = String(fullName || "").split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid GitHub repository");
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

function githubRepoPath(fullName) {
  const { owner, repo } = splitGitHubFullName(fullName);
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string" && data.message) {
      return data.message;
    }
    if (typeof data?.error === "string" && data.error) {
      return data.error;
    }
  } catch {
    // Ignore parse errors and use the status fallback.
  }

  return `${fallback}: ${response.status}`;
}

export function resolveTargetBranch(target, fallback = "") {
  if (!target) {
    return "";
  }

  return target.branch || target.defaultBranch || fallback || "";
}

export async function listBranchesForTarget(session, target) {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  if (target.provider === "gitlab") {
    return listGitLabBranches(session.accessToken, target.id);
  }

  return listGitHubBranches(session.accessToken, target.fullName);
}

async function listGitHubBranches(token, fullName) {
  const names = [];
  let url = `https://api.github.com/repos/${githubRepoPath(fullName)}/branches?per_page=100`;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const response = await fetch(url, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Could not list GitHub branches"));
    }

    const data = await response.json();
    names.push(
      ...data
        .map((branch) => branch?.name)
        .filter((name) => typeof name === "string" && name),
    );
    url = nextLinkFromHeader(response.headers.get("link"));
    pages += 1;
  }

  return names;
}

async function listGitLabBranches(token, projectId) {
  const names = [];
  let page = 1;

  while (page && page <= MAX_PAGES) {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: gitlabHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Could not list GitLab branches"));
    }

    const data = await response.json();
    names.push(
      ...data
        .map((branch) => branch?.name)
        .filter((name) => typeof name === "string" && name),
    );
    const nextPage = response.headers.get("x-next-page");
    page = nextPage ? Number(nextPage) : 0;
  }

  return names;
}

export async function checkProjectManagerFile(session, target, branch) {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  if (!branch) {
    return { exists: false, branch: "", checked: false };
  }

  const exists =
    target.provider === "gitlab"
      ? await gitLabFileExists(session.accessToken, target.id, branch)
      : await gitHubFileExists(session.accessToken, target.fullName, branch);

  return { exists, branch, checked: true };
}

async function gitHubFileExists(token, fullName, branch) {
  const path = githubRepoPath(fullName);
  const url = `https://api.github.com/repos/${path}/contents/${encodeURIComponent(PROJECT_MANAGER_FILE)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not check PROJECT_MANAGER.md"));
  }

  return true;
}

async function gitLabFileExists(token, projectId, branch) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(PROJECT_MANAGER_FILE)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: gitlabHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not check PROJECT_MANAGER.md"));
  }

  return true;
}

export async function createProjectManagerFile(session, target, branch) {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  if (!branch) {
    throw new Error("Select a branch first.");
  }

  if (target.provider === "gitlab") {
    await createGitLabFile(session.accessToken, target.id, branch);
    return;
  }

  await createGitHubFile(session.accessToken, target.fullName, branch);
}

async function createGitHubFile(token, fullName, branch) {
  const path = githubRepoPath(fullName);
  const url = `https://api.github.com/repos/${path}/contents/${encodeURIComponent(PROJECT_MANAGER_FILE)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: PROJECT_MANAGER_COMMIT_MESSAGE,
      content: Buffer.from(PROJECT_MANAGER_CONTENT, "utf8").toString("base64"),
      branch,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not create PROJECT_MANAGER.md"));
  }
}

async function createGitLabFile(token, projectId, branch) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(PROJECT_MANAGER_FILE)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...gitlabHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch,
      content: PROJECT_MANAGER_CONTENT,
      commit_message: PROJECT_MANAGER_COMMIT_MESSAGE,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not create PROJECT_MANAGER.md"));
  }
}
