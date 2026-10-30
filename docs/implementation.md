# Git Connector — Implementation Summary

A Next.js 16 (JavaScript) app that connects to GitHub or GitLab with OAuth 2.0, lists accessible repositories, and lets the user pick one as the **targeted repository**. After a repo is targeted, it checks for `PROJECT_MANAGER.md` on the selected branch and can commit that file if it is missing. It also maps Markdown files on that branch and shows a file's contents in a drawer.

It does **not** clone code or open issues. The only write is creating `PROJECT_MANAGER.md`. Markdown files are read through the provider API.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16.4.3, App Router, JavaScript |
| UI | React 19, Tailwind CSS 4, react-markdown |
| Auth | `@github-connector/auth` (Better Auth GitHub/GitLab OAuth) |
| Providers | GitHub OAuth App, GitLab.com OAuth application |
| Clients | `@github-connector/auth/client` (any React app); Expo via `expoClient` |

## User flow

1. `/` shows **Connect GitHub** and **Connect GitLab**.
2. OAuth 2.0 authorization-code flow runs against that provider.
3. `/dashboard` lists repositories the signed-in user can access.
4. Clicking a repo stores it as the target (httpOnly cookie) and highlights it.
5. The targeted card shows a branch picker (default branch selected) and checks for `PROJECT_MANAGER.md`.
6. If the file is missing, a warning and **Create PROJECT_MANAGER.md** button commit it to the selected branch.
7. The dashboard lists `.md` and `.markdown` files on the selected branch. Clicking one opens its contents in a drawer.
8. **Clear** removes the target. **Disconnect** signs out and deletes the cookie.

Only one provider can be connected at a time.

```
Browser  →  Connect button (authClient.signIn.social)
App      →  GitHub / GitLab authorize URL (state + scopes)
Provider →  /api/auth/callback/{github|gitlab}?code=...
App      →  exchange code for access_token
App      →  store user, session, and encrypted token in SQLite
Dashboard→  GitHub GET /user/repos  or  GitLab GET /api/v4/projects
User     →  select repo → targeted_repo cookie
Dashboard→  list branches, check PROJECT_MANAGER.md
User     →  optional: create PROJECT_MANAGER.md on the selected branch
Dashboard→  list Markdown files on the selected branch
User     →  open a file → drawer shows its contents
```

## Project layout

```
packages/auth/                   Reusable GitHub/GitLab Better Auth library
lib/auth.js                      createGitAuth() wrapper for this app
lib/auth-client.js               createGitAuthClient() wrapper
app/page.js                      Home: connect buttons
app/layout.js                    Root layout
app/actions.js                   Server actions: disconnect, target, create file, read Markdown
app/dashboard/page.js            Repo list, targeted repo, Markdown map
app/dashboard/loading.js         Dashboard loading UI
app/api/auth/[...all]/           Better Auth OAuth + session routes
app/api/repos/route.js           GET JSON repo list
app/api/target/route.js          GET / POST / DELETE target cookie
lib/repos.js                     GitHub / GitLab list helpers
lib/project-manager.js           Branches + PROJECT_MANAGER.md check/create
lib/markdown-files.js            List and read Markdown files on the target branch
lib/target.js                    Target cookie helpers
components/ConnectButtons.js     Connect GitHub / GitLab (client)
components/RepoList.js           Searchable list, select target
components/TargetedRepo.js       Target card, branch picker, file warning
components/MarkdownMap.js        Markdown folder map and contents drawer
components/Icons.js              GitHub / GitLab SVGs
docs/better-auth.md              Better Auth, SQLite default, other databases
docs/oauth-setup.md              How to create OAuth apps and fill .env.local
.env.example                     Env var template
data/auth.sqlite                 Local Better Auth database (gitignored)
```

## Authentication

The OAuth flow lives in [`packages/auth`](../packages/auth). This app is a thin consumer:

```js
import { createGitAuth } from "@github-connector/auth/server";
import { createGitAuthClient } from "@github-connector/auth/client";

export const auth = createGitAuth();
export const authClient = createGitAuthClient();
```

- Secret and origin come from `AUTH_SECRET` and `AUTH_URL`
- GitHub scopes: `repo` (Better Auth also requests identity scopes)
- GitLab scopes: `api` (gitlab.com only; includes read and write)
- `expo()` plugin and `exp://` trusted origins so an Expo app can use this same backend
- `nextCookies()` so server actions can set the session cookie

SQLite (`data/auth.sqlite`) stores the user, session, and provider account. The GitHub/GitLab access token is encrypted in the account row and read only on the server via `getGitSession` / `auth.api.getAccessToken`. It is not sent to the browser.

Connect uses the portable React client in `lib/auth-client.js`:

- `authClient.signIn.social({ provider: "github" | "gitlab", callbackURL: "/dashboard" })`

Another React app uses `createGitAuthClient({ baseURL })`. An Expo app also passes `expoClient` from `@better-auth/expo/client`. See [packages/auth/README.md](../packages/auth/README.md).

Disconnect is a Server Action in `app/actions.js`: clear the target cookie, then `disconnectGitAuth` (delete the Better Auth user so a leftover GitLab or GitHub account cannot block the other provider with `account_not_linked`).

## Listing repositories

`lib/repos.js` uses the session access token (server-side only):

- GitHub: `GET https://api.github.com/user/repos` (up to 5 pages × 100)
- GitLab: `GET https://gitlab.com/api/v4/projects?membership=true` (same page cap)

Each item is normalized to:

```js
{ id, name, fullName, url, private, description, provider, defaultBranch }
```

The dashboard loads this in a Server Component. `GET /api/repos` returns the same JSON for API clients (including a future Expo/React client). Both require a signed-in session.

## Targeting a repository

Stored in the `targeted_repo` httpOnly cookie (`lib/target.js`), 30-day max age, `sameSite: lax`.

Shape: `{ id, name, fullName, url, private, description, provider, branch, defaultBranch }`

- UI: `selectTarget` / `selectBranch` / `clearTarget` / `createProjectManager` / `readMarkdownFile` Server Actions. Target changes call `revalidatePath("/dashboard")`
- API: `GET` / `POST` / `DELETE /api/target`
- If the stored provider does not match the current session provider, the target is ignored

## PROJECT_MANAGER.md

After a target is set, the dashboard lists branches and checks the repo root for `PROJECT_MANAGER.md` on the selected branch (`lib/project-manager.js`).

- GitHub: `GET /repos/{owner}/{repo}/contents/PROJECT_MANAGER.md?ref={branch}`
- GitLab: `GET /api/v4/projects/{id}/repository/files/PROJECT_MANAGER.md?ref={branch}`

A 404 is treated as missing. The targeted card then shows an amber warning and **Create PROJECT_MANAGER.md**, which commits a starter file:

- GitHub: `PUT /repos/{owner}/{repo}/contents/PROJECT_MANAGER.md`
- GitLab: `POST /api/v4/projects/{id}/repository/files/PROJECT_MANAGER.md`

`createProjectManager` is a Server Action. Tokens stay on the server. GitLab users who previously authorized `read_api` must disconnect and reconnect after the GitLab OAuth application has `api` enabled.

## Markdown map

After a target and branch are set, the dashboard loads Markdown paths in parallel with the `PROJECT_MANAGER.md` check (`lib/markdown-files.js`). The client builds a folder tree. `README.md` is sorted first inside each folder. Clicking a file calls the `readMarkdownFile` Server Action, which reads that path on the targeted branch and returns the text. The drawer renders it with `react-markdown` and `remark-gfm`. Tokens stay on the server.

- GitHub list: `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`
- GitHub read: `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}`
- GitLab list: `GET /api/v4/projects/{id}/repository/tree?recursive=true&ref={branch}`
- GitLab read: `GET /api/v4/projects/{id}/repository/files/{path}?ref={branch}`

Paths must be `.md` or `.markdown`, with no `..` segments. A missing tree (empty repository or unknown ref) is an empty list. Files larger than 512 KB are refused. If the provider truncates the tree, the UI says the list may be incomplete.

## Routes

| Method | Path | Role |
| --- | --- | --- |
| — | `/` | Connect UI; redirects to dashboard if already signed in |
| — | `/dashboard` | Repo list, target, and Markdown map; redirects home if signed out |
| GET, POST | `/api/auth/*` | Better Auth OAuth and session |
| GET | `/api/repos` | List repos for the current provider |
| GET | `/api/target` | Current target or `null` |
| POST | `/api/target` | Set target |
| DELETE | `/api/target` | Clear target |

`/api/repos` and `/api/target` return `401` without a session.

## Environment

Copy `.env.example` → `.env.local`. Never commit `.env.local`.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Signs cookies and encrypts OAuth tokens (required) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App |
| `AUTH_GITLAB_ID` / `AUTH_GITLAB_SECRET` | GitLab OAuth application |
| `AUTH_URL` | App origin, e.g. `http://localhost:3000` |
| `AUTH_DATABASE_PATH` | SQLite file path. Default: `data/auth.sqlite` |

Create the SQLite schema once:

```bash
npm run auth:migrate
```

Local callbacks:

- `http://localhost:3000/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/gitlab`

OAuth app creation steps: [oauth-setup.md](oauth-setup.md). Database configuration: [better-auth.md](better-auth.md).

## Out of scope (current)

- Issues, pull requests, or writes other than creating `PROJECT_MANAGER.md`
- GitHub Apps (fine-grained) — OAuth Apps only
- Self-hosted GitLab
- Connecting GitHub and GitLab at the same time
- A bundled Expo app (the auth server is Expo-ready; no native client is included)
