# Git Connector — Implementation Summary

A Next.js 16 (JavaScript) app that connects to GitHub or GitLab with OAuth 2.0, lists accessible repositories, and lets the user pick one as the **targeted repository**.

It does **not** write to repositories, clone code, or open issues.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16.4.3, App Router, JavaScript |
| UI | React 19, Tailwind CSS 4 |
| Auth | Better Auth (`better-auth`), SQLite sessions, encrypted OAuth tokens |
| Providers | GitHub OAuth App, GitLab.com OAuth application |
| Clients | `better-auth/react` (any React app); `@better-auth/expo` ready for Expo |

## User flow

1. `/` shows **Connect GitHub** and **Connect GitLab**.
2. OAuth 2.0 authorization-code flow runs against that provider.
3. `/dashboard` lists repositories the signed-in user can access.
4. Clicking a repo stores it as the target (httpOnly cookie) and highlights it.
5. **Clear** removes the target. **Disconnect** signs out and deletes the cookie.

Only one provider can be connected at a time.

```
Browser  →  Connect button (authClient.signIn.social)
App      →  GitHub / GitLab authorize URL (state + scopes)
Provider →  /api/auth/callback/{github|gitlab}?code=...
App      →  exchange code for access_token
App      →  store user, session, and encrypted token in SQLite
Dashboard→  GitHub GET /user/repos  or  GitLab GET /api/v4/projects
User     →  select repo → targeted_repo cookie
```

## Project layout

```
lib/auth.js                      Better Auth server (providers, SQLite, Expo plugin)
lib/auth-client.js               better-auth/react client (works in any React app)
app/page.js                      Home: connect buttons
app/layout.js                    Root layout
app/actions.js                   Server actions: disconnect, target
app/dashboard/page.js            Repo list + targeted repo
app/dashboard/loading.js         Dashboard loading UI
app/api/auth/[...all]/           Better Auth OAuth + session routes
app/api/repos/route.js           GET JSON repo list
app/api/target/route.js          GET / POST / DELETE target cookie
lib/repos.js                     GitHub / GitLab list helpers
lib/target.js                    Target cookie helpers
components/ConnectButtons.js     Connect GitHub / GitLab (client)
components/RepoList.js           Searchable list, select target
components/TargetedRepo.js       Current target card
components/Icons.js              GitHub / GitLab SVGs
docs/better-auth.md              Better Auth, SQLite default, other databases
docs/oauth-setup.md              How to create OAuth apps and fill .env.local
.env.example                     Env var template
data/auth.sqlite                 Local Better Auth database (gitignored)
```

## Authentication

Configured in `lib/auth.js`.

- Secret and origin come from `AUTH_SECRET` and `AUTH_URL`
- GitHub scopes: `read:user user:email repo`
- GitLab scopes: `read_user read_api` (gitlab.com only)
- `expo()` plugin and `exp://` trusted origins so an Expo app can use this same backend
- `nextCookies()` so server actions can set the session cookie

SQLite (`data/auth.sqlite`) stores the user, session, and provider account. The GitHub/GitLab access token is encrypted in the account row and read only on the server via `auth.api.getAccessToken`. It is not sent to the browser.

Connect uses the portable React client in `lib/auth-client.js`:

- `authClient.signIn.social({ provider: "github" | "gitlab", callbackURL: "/dashboard" })`

An Expo app would use the same `createAuthClient` from `better-auth/react`, plus `expoClient` from `@better-auth/expo/client` and `baseURL` pointing at this server.

Disconnect is a Server Action in `app/actions.js`: clear the target cookie, then `auth.api.signOut`.

## Listing repositories

`lib/repos.js` uses the session access token (server-side only):

- GitHub: `GET https://api.github.com/user/repos` (up to 5 pages × 100)
- GitLab: `GET https://gitlab.com/api/v4/projects?membership=true` (same page cap)

Each item is normalized to:

```js
{ id, name, fullName, url, private, description, provider }
```

The dashboard loads this in a Server Component. `GET /api/repos` returns the same JSON for API clients (including a future Expo/React client). Both require a signed-in session.

## Targeting a repository

Stored in the `targeted_repo` httpOnly cookie (`lib/target.js`), 30-day max age, `sameSite: lax`.

Shape: `{ id, name, fullName, url, private, description, provider }`

- UI: `selectTarget` / `clearTarget` Server Actions, then `revalidatePath("/dashboard")`
- API: `GET` / `POST` / `DELETE /api/target`
- If the stored provider does not match the current session provider, the target is ignored

## Routes

| Method | Path | Role |
| --- | --- | --- |
| — | `/` | Connect UI; redirects to dashboard if already signed in |
| — | `/dashboard` | Repo list + target; redirects home if signed out |
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

- Writing files, commits, issues, or PRs
- GitHub Apps (fine-grained) — OAuth Apps only
- Self-hosted GitLab
- Connecting GitHub and GitLab at the same time
- A bundled Expo app (the auth server is Expo-ready; no native client is included)

GitHub’s `repo` scope *can* write, but this app never calls write APIs. GitLab is read-only (`read_api`).
