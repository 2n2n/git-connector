# Git Connector

A small Next.js app that connects to **GitHub** or **GitLab** with **OAuth 2.0**, lists the repositories you can access, and lets you pick one as the targeted repository.

## What it does

1. Shows a **Connect GitHub** button and a **Connect GitLab** button.
2. Completes the OAuth 2.0 authorization-code flow with that provider.
3. Lists repositories you own or can access.
4. Lets you select one repository as the **target**. The selection is stored in an httpOnly cookie.
5. After you pick a repo, choose a branch. The app checks for `PROJECT_MANAGER.md` on that branch and can create it with a commit if it is missing.
6. The dashboard maps every `.md` and `.markdown` file on that branch. Click a file to open its contents in a side drawer.

The app does not clone code or open issues. The only write is committing `PROJECT_MANAGER.md` to the selected branch when you ask it to. Markdown files are read from GitHub or GitLab when you open them.

How the app is built: [docs/implementation.md](docs/implementation.md). Better Auth and database setup: [docs/better-auth.md](docs/better-auth.md). Reuse the auth flow in another project: [packages/auth/README.md](packages/auth/README.md).

## Prerequisites

- Node.js 20.9 or later
- npm
- A GitHub account and/or a GitLab.com account
- A GitHub OAuth App and/or a GitLab OAuth application

## Setup

```bash
npm install
cp .env.example .env.local
```

Generate a session secret and paste it into `.env.local`:

```bash
openssl rand -base64 32
```

Then add the OAuth client ID and secret for each provider you want to use. Step-by-step instructions:

- [GitHub `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`](docs/oauth-setup.md#github-auth_github_id-and-auth_github_secret)
- [GitLab `AUTH_GITLAB_ID` / `AUTH_GITLAB_SECRET`](docs/oauth-setup.md#gitlab-auth_gitlab_id-and-auth_gitlab_secret)

Full walkthrough: [docs/oauth-setup.md](docs/oauth-setup.md).

Create the local Better Auth SQLite schema:

```bash
npm run auth:migrate
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Signs cookies and encrypts OAuth tokens. Required. |
| `AUTH_GITHUB_ID` | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret |
| `AUTH_GITLAB_ID` | GitLab OAuth application ID |
| `AUTH_GITLAB_SECRET` | GitLab OAuth application secret |
| `AUTH_URL` | App origin, e.g. `http://localhost:3000` |
| `AUTH_DATABASE_PATH` | SQLite file path. Default: `data/auth.sqlite` |

Never commit `.env.local`. `.env.example` is safe to commit.

## How OAuth 2.0 works here

```
Browser  →  / (Connect button)
App      →  GitHub or GitLab authorize URL (state + scopes)
Provider →  /api/auth/callback/github or /api/auth/callback/gitlab?code=...
App      →  token endpoint, exchanges code for access_token
App      →  stores user, session, and encrypted access_token in SQLite
Dashboard→  calls GitHub GET /user/repos or GitLab GET /api/v4/projects
```

[Better Auth](https://www.better-auth.com) handles CSRF `state`, the code exchange, and the session cookie, wrapped by [`@github-connector/auth`](packages/auth). The same `createGitAuthClient()` works in any React app. An Expo app can talk to this backend with `expoClient` from `@better-auth/expo/client`. The provider access token stays on the server (`getGitSession`) and is used only in route handlers and Server Components. It is not sent to browser JavaScript.

You can only be connected to one provider at a time. Disconnect, then connect the other.

## Targeting a repository

Click a repository in the dashboard list. The app stores `{ id, name, fullName, url, private, provider, branch, defaultBranch }` in the `targeted_repo` httpOnly cookie.

That repo is shown at the top of the dashboard as the current target, with a branch picker. If `PROJECT_MANAGER.md` is missing on the selected branch, a warning and **Create PROJECT_MANAGER.md** button appear. **Clear** removes the target. **Disconnect** signs out and deletes the target cookie.

## Markdown files

With a repository and branch selected, the dashboard lists Markdown files as a folder map. `README` files are listed first in each folder. Filter the list by path. Click a file to open a drawer with the rendered contents. **Close**, the backdrop, or Escape dismisses the drawer. Switching branch or repository loads that branch's files.

## API routes

| Method | Path | Description |
| --- | --- | --- |
| `GET`, `POST` | `/api/auth/*` | Better Auth OAuth and session endpoints |
| `GET` | `/api/repos` | JSON list of repositories for the signed-in provider |
| `GET` | `/api/target` | Current targeted repository, or `null` |
| `POST` | `/api/target` | Set the target. Body: `{ id, name, fullName, url, private, provider, branch, defaultBranch }` |
| `DELETE` | `/api/target` | Clear the target |

All `/api/repos` and `/api/target` routes require a signed-in session.

## Project layout

```
packages/auth/                   Reusable GitHub/GitLab auth library
lib/auth.js                      createGitAuth() for this app
lib/auth-client.js               createGitAuthClient() for this app
app/dashboard/page.js            Repo list, target, and Markdown map
app/actions.js                   Sign-out, select/clear target, create PROJECT_MANAGER.md, read a Markdown file
app/api/auth/[...all]/           OAuth callbacks
app/api/repos/route.js           List repositories
app/api/target/route.js          Read/write/clear target cookie
components/MarkdownMap.js        Markdown folder map and file drawer
lib/repos.js                     GitHub and GitLab list helpers
lib/project-manager.js           Branch list, PROJECT_MANAGER.md check/create
lib/markdown-files.js            List and read Markdown files on the target branch
lib/target.js                    Target cookie helpers
```

## Scripts

```bash
npm run dev           # http://localhost:3000
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint
npm test              # unit tests for @github-connector/auth
npm run auth:migrate  # create/update the local SQLite auth schema
```
