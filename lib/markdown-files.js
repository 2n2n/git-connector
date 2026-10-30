const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILES = 1000;
const MAX_PAGES = 20;

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

function encodeGitPath(filePath) {
  return filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
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

export function isMarkdownPath(filePath) {
  const lower = String(filePath || "").toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function assertMarkdownPath(filePath) {
  if (typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  const path = filePath.trim();
  if (!path || path.length > 1024 || path.startsWith("/") || path.endsWith("/")) {
    throw new Error("Invalid file path");
  }

  if (path.includes("\\") || path.includes("\0")) {
    throw new Error("Invalid file path");
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid file path");
  }

  if (!isMarkdownPath(path)) {
    throw new Error("Only Markdown files can be opened.");
  }

  return path;
}

function acceptMarkdownPath(filePath) {
  if (!isMarkdownPath(filePath)) {
    return null;
  }

  try {
    return assertMarkdownPath(filePath);
  } catch {
    return null;
  }
}

function comparePath(a, b) {
  return a.path.localeCompare(b.path, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function decodeBase64Content(content, size) {
  if (typeof size === "number" && size > MAX_FILE_BYTES) {
    throw new Error("This file is too large to show in the drawer.");
  }

  const text = Buffer.from(String(content || "").replace(/\s/g, ""), "base64").toString(
    "utf8",
  );

  if (text.length > MAX_FILE_BYTES) {
    throw new Error("This file is too large to show in the drawer.");
  }

  if (text.includes("\0")) {
    throw new Error("This file is not text.");
  }

  return text.replace(/^\uFEFF/, "");
}

export async function listMarkdownFiles(session, target, branch) {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  if (!branch) {
    return { files: [], truncated: false };
  }

  if (target.provider === "gitlab") {
    return listGitLabMarkdown(session.accessToken, target.id, branch);
  }

  return listGitHubMarkdown(session.accessToken, target.fullName, branch);
}

async function listGitHubMarkdown(token, fullName, branch) {
  const url = `https://api.github.com/repos/${githubRepoPath(fullName)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const response = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404 || response.status === 409) {
    return { files: [], truncated: false };
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not list Markdown files"));
  }

  const data = await response.json();
  const files = [];
  const seen = new Set();

  for (const item of Array.isArray(data.tree) ? data.tree : []) {
    if (item?.type !== "blob") {
      continue;
    }

    const path = acceptMarkdownPath(item.path);
    if (!path || seen.has(path)) {
      continue;
    }

    seen.add(path);
    files.push({ path });
  }

  files.sort(comparePath);
  const capped = files.slice(0, MAX_FILES);

  return {
    files: capped,
    truncated: Boolean(data.truncated) || files.length > MAX_FILES,
  };
}

async function listGitLabMarkdown(token, projectId, branch) {
  const files = [];
  const seen = new Set();
  let page = 1;
  let truncated = false;

  while (page && page <= MAX_PAGES) {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree?recursive=true&per_page=100&ref=${encodeURIComponent(branch)}&page=${page}`;
    const response = await fetch(url, {
      headers: gitlabHeaders(token),
      cache: "no-store",
    });

    if (response.status === 404) {
      if (page === 1) {
        return { files: [], truncated: false };
      }
      break;
    }

    if (!response.ok) {
      throw new Error(await readApiError(response, "Could not list Markdown files"));
    }

    const data = await response.json();
    for (const item of Array.isArray(data) ? data : []) {
      if (item?.type !== "blob") {
        continue;
      }

      const path = acceptMarkdownPath(item.path);
      if (!path || seen.has(path)) {
        continue;
      }

      seen.add(path);
      files.push({ path });
    }

    if (files.length >= MAX_FILES) {
      truncated = true;
      break;
    }

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      page = 0;
    } else if (page >= MAX_PAGES) {
      truncated = true;
      page = 0;
    } else {
      page = Number(nextPage);
    }
  }

  files.sort(comparePath);
  const capped = files.slice(0, MAX_FILES);

  return {
    files: capped,
    truncated: truncated || files.length > MAX_FILES,
  };
}

export async function readMarkdownFileContent(session, target, branch, filePath) {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }

  if (!branch) {
    throw new Error("Select a branch first.");
  }

  const path = assertMarkdownPath(filePath);

  if (target.provider === "gitlab") {
    return readGitLabMarkdown(session.accessToken, target.id, branch, path);
  }

  return readGitHubMarkdown(session.accessToken, target.fullName, branch, path);
}

async function readGitHubMarkdown(token, fullName, branch, filePath) {
  const url = `https://api.github.com/repos/${githubRepoPath(fullName)}/contents/${encodeGitPath(filePath)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new Error("That file is not on this branch.");
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not read Markdown file"));
  }

  const data = await response.json();
  if (Array.isArray(data) || data?.type !== "file") {
    throw new Error("That path is not a file.");
  }

  if (typeof data.size === "number" && data.size > MAX_FILE_BYTES) {
    throw new Error("This file is too large to show in the drawer.");
  }

  if (typeof data.content === "string") {
    return decodeBase64Content(data.content, data.size);
  }

  if (typeof data.git_url === "string" && data.git_url) {
    return readGitHubBlob(token, data.git_url, data.size);
  }

  throw new Error("Could not read Markdown file");
}

async function readGitHubBlob(token, url, size) {
  const response = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not read Markdown file"));
  }

  const data = await response.json();
  if (data?.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error("Could not read Markdown file");
  }

  return decodeBase64Content(data.content, size ?? data.size);
}

async function readGitLabMarkdown(token, projectId, branch, filePath) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: gitlabHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new Error("That file is not on this branch.");
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "Could not read Markdown file"));
  }

  const data = await response.json();
  if (data?.encoding && data.encoding !== "base64") {
    throw new Error("Could not read Markdown file");
  }

  return decodeBase64Content(data.content, data.size);
}
