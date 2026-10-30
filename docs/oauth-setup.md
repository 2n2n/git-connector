# OAuth environment variables

This app reads GitHub and GitLab credentials from `.env.local`. Start from the example file:

```bash
cp .env.example .env.local
```

You need `AUTH_SECRET` and `AUTH_URL` for every run. You only need a GitHub pair, a GitLab pair, or both — depending on which **Connect** button you want to use.

After filling `.env.local`, create the local Better Auth SQLite schema (see [better-auth.md](better-auth.md)):

```bash
npm run auth:migrate
```

```bash
# GitHub OAuth App
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# GitLab OAuth application (gitlab.com)
AUTH_GITLAB_ID=
AUTH_GITLAB_SECRET=
```

Never commit `.env.local`. Restart `npm run dev` after changing these values.

---

## GitHub: `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

These come from a **GitHub OAuth App** (not a GitHub App, and not a personal access token).

### 1. Open the OAuth Apps page

1. Sign in to GitHub.
2. Open [https://github.com/settings/developers](https://github.com/settings/developers).
3. Select **OAuth Apps**.
4. Click **New OAuth App**.

You can also go to **Settings → Developer settings → OAuth Apps**.

### 2. Register the app

Fill in:

| Field | Local development value |
| --- | --- |
| **Application name** | `Git Connector` (any name is fine) |
| **Homepage URL** | `http://localhost:3000` |
| **Application description** | Optional |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` |

The callback URL must match exactly, including `http`, the port, and `/api/auth/callback/github`.

Click **Register application**.

### 3. Copy the credentials

On the app’s page:

1. Copy **Client ID** into `AUTH_GITHUB_ID`.
2. Click **Generate a new client secret**.
3. Copy the secret immediately into `AUTH_GITHUB_SECRET`. GitHub shows it only once.

Example:

```bash
AUTH_GITHUB_ID=Iv1.xxxxxxxxxxxxxxxx
AUTH_GITHUB_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Scopes this app requests

The app asks GitHub for:

- `read:user` — identify the signed-in user
- `user:email` — required by Better Auth to create the user record
- `repo` — list private repositories

GitHub OAuth Apps have no read-only private-repo scope. `repo` also allows write access. This app lists repositories and, when asked, commits a `PROJECT_MANAGER.md` file to the selected branch.

### Production callback

If you deploy the app, add a second callback (or create a second OAuth App) using:

```
https://YOUR_DOMAIN/api/auth/callback/github
```

Set `AUTH_URL` to that same origin.

---

## GitLab: `AUTH_GITLAB_ID` and `AUTH_GITLAB_SECRET`

These come from a **GitLab OAuth application** on [gitlab.com](https://gitlab.com). This project does not talk to self-hosted GitLab.

### 1. Open Applications

1. Sign in to GitLab.com.
2. Open [https://gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications).

You can also go to **Avatar → Preferences → Applications**.

### 2. Create the application

Click **Add new application** and fill in:

| Field | Local development value |
| --- | --- |
| **Name** | `Git Connector` (any name is fine) |
| **Redirect URI** | `http://localhost:3000/api/auth/callback/gitlab` |
| **Confidential** | Enabled (checked) |
| **Scopes** | `read_user` and `api` |

Leave other scopes unchecked. If this GitLab application already exists with only `read_api`, edit it, enable `api`, and save. Anyone already connected must **Disconnect** in this app and connect GitLab again so GitLab issues a token with write access.

Click **Save application**.

### 3. Copy the credentials

GitLab shows:

- **Application ID** → `AUTH_GITLAB_ID`
- **Secret** → `AUTH_GITLAB_SECRET`

Copy the secret before you leave the page.

Example:

```bash
AUTH_GITLAB_ID=xxxxxxxxxxxxxxxxxxxx
AUTH_GITLAB_SECRET=gloas-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Scopes this app requests

- `read_user` — identify the signed-in user
- `api` — list projects and create `PROJECT_MANAGER.md` on a selected branch (`api` includes `read_api`)

### Production redirect URI

For a deployed app, use:

```
https://YOUR_DOMAIN/api/auth/callback/gitlab
```

You can add both the local and production URIs on the same GitLab application, one per line.

---

## Check that `.env.local` is complete

Minimum for GitHub only:

```bash
AUTH_SECRET=paste-output-of-openssl-rand-base64-32
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
AUTH_URL=http://localhost:3000
```

Then run `npm run auth:migrate`.

Minimum for GitLab only:

```bash
AUTH_SECRET=paste-output-of-openssl-rand-base64-32
AUTH_GITLAB_ID=your-gitlab-application-id
AUTH_GITLAB_SECRET=your-gitlab-secret
AUTH_URL=http://localhost:3000
```

Then run `npm run auth:migrate`.

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Connect GitHub** or **Connect GitLab**. GitHub or GitLab should ask you to authorize the app, then send you back to `/dashboard` with your repositories listed.

## Common mistakes

- Using a **GitHub App** or a **personal access token** instead of an **OAuth App**. This project needs the OAuth App Client ID and Client Secret.
- Callback / redirect URI typos (`https` on localhost, wrong port, missing `/api/auth/callback/github` or `/gitlab`).
- Putting values in `.env.example` instead of `.env.local`. Next.js loads `.env.local`.
- Skipping `npm run auth:migrate` so Better Auth has no SQLite tables.
- Forgetting to restart the dev server after editing env vars.
- Committing `.env.local` (it is gitignored on purpose).
- GitLab application missing the `api` scope, or an existing GitLab session that still has a `read_api` token. Enable `api` on the GitLab application, then Disconnect and connect again.
