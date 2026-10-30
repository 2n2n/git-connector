import { headers } from "next/headers";
import { connection } from "next/server";
import { getGitSession } from "@github-connector/auth/server";
import { auth } from "@/lib/auth";

const MAX_PAGES = 5;

export async function getConnectorSession() {
  await connection();
  return getGitSession(auth, await headers());
}

export async function listRepos() {
  const session = await getConnectorSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  return listReposForSession(session);
}

export async function listReposForSession(session) {
  if (session.provider === "gitlab") {
    return listGitLabRepos(session.accessToken);
  }

  return listGitHubRepos(session.accessToken);
}

function mapGitHubRepo(repo) {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    private: Boolean(repo.private),
    description: repo.description || "",
    provider: "github",
    defaultBranch: repo.default_branch || "",
  };
}

function mapGitLabProject(project) {
  return {
    id: String(project.id),
    name: project.name,
    fullName: project.path_with_namespace,
    url: project.web_url,
    private: project.visibility !== "public",
    description: project.description || "",
    provider: "gitlab",
    defaultBranch: project.default_branch || "",
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

async function listGitHubRepos(token) {
  const repos = [];
  let url =
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member";
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-connector",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    repos.push(...data.map(mapGitHubRepo));
    url = nextLinkFromHeader(response.headers.get("link"));
    pages += 1;
  }

  return repos;
}

async function listGitLabRepos(token) {
  const repos = [];
  let page = 1;

  while (page && page <= MAX_PAGES) {
    const url = `https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100&order_by=last_activity_at&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "github-connector",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    const data = await response.json();
    repos.push(...data.map(mapGitLabProject));
    const nextPage = response.headers.get("x-next-page");
    page = nextPage ? Number(nextPage) : 0;
  }

  return repos;
}
