# `@github-connector/auth`

Reusable GitHub and GitLab OAuth for Better Auth. Use it as the auth server in a Next.js app, and as the client in any React or Expo app.

This package is not published to npm. Another project can copy `packages/auth` or depend on it with `file:`.

## Install

In this repo the Next.js app already depends on the workspace package.

In another project:

```bash
npm install better-auth @better-auth/expo better-sqlite3
```

Then copy this folder or add:

```json
{
  "dependencies": {
    "@github-connector/auth": "file:../github-connector/packages/auth"
  }
}
```

## Server (Next.js host)

```js
import { createGitAuth } from "@github-connector/auth/server";

export const auth = createGitAuth();
```

`createGitAuth()` reads the same env vars as this app. Default GitHub scope is `repo`; default GitLab scope is `api` (Better Auth also requests identity scopes).

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Signs cookies and encrypts OAuth tokens |
| `AUTH_URL` | Auth server origin |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App |
| `AUTH_GITLAB_ID` / `AUTH_GITLAB_SECRET` | GitLab OAuth application |
| `AUTH_DATABASE_PATH` | SQLite file. Default: `data/auth.sqlite` |

Or pass options:

```js
import { Pool } from "pg";
import { createGitAuth } from "@github-connector/auth/server";

export const auth = createGitAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  github: { clientId: "...", clientSecret: "..." },
  gitlab: { clientId: "...", clientSecret: "..." },
});
```

Mount Better Auth on a catch-all route:

```js
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

Callback URLs:

- `{AUTH_URL}/api/auth/callback/github`
- `{AUTH_URL}/api/auth/callback/gitlab`

Mark `better-sqlite3` as a server external package in `next.config` if you use the default SQLite store.

## Session and disconnect

```js
import { getGitSession, disconnectGitAuth } from "@github-connector/auth/server";

const session = await getGitSession(auth, requestHeaders);
// { user, provider: "github" | "gitlab", accessToken } or null

await disconnectGitAuth(auth, requestHeaders);
```

`getGitSession` requires a GitHub or GitLab account and a decryptable access token. `disconnectGitAuth` deletes the user (so leftover accounts cannot block the other provider) then signs out.

## Client (any React app)

Same origin, as in this Next.js UI:

```js
import { createGitAuthClient } from "@github-connector/auth/client";

export const authClient = createGitAuthClient();

await authClient.signIn.social({
  provider: "github",
  callbackURL: "/dashboard",
});
```

Remote React app:

```js
export const authClient = createGitAuthClient({
  baseURL: "https://your-auth-server.example",
});
```

Expo — pass `expoClient` from the Expo package so web bundles never import React Native:

```js
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { createGitAuthClient } from "@github-connector/auth/client";

export const authClient = createGitAuthClient({
  baseURL: "https://your-auth-server.example",
  expo: {
    scheme: "myapp",
    storagePrefix: "myapp",
    storage: SecureStore,
  },
  expoClient,
});
```

## Tests

```bash
npm test -w @github-connector/auth
```
