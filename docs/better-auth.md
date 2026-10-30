# Better Auth

This app uses [Better Auth](https://www.better-auth.com) for GitHub and GitLab OAuth. The same `better-auth/react` client works in any React app. An Expo app can talk to this backend with `@better-auth/expo`.

Server config lives in [`lib/auth.js`](../lib/auth.js). The browser client lives in [`lib/auth-client.js`](../lib/auth-client.js).

## Default database: SQLite

By default Better Auth uses **SQLite** through `better-sqlite3`. The file is:

```
data/auth.sqlite
```

That directory is created automatically. The file is gitignored.

Tables:

| Table | Stores |
| --- | --- |
| `user` | Signed-in identity (name, email, image) |
| `session` | Session token and expiry |
| `account` | GitHub/GitLab account, including the encrypted access token |
| `verification` | Short-lived OAuth state |

Create or update the schema after changing env vars or the database:

```bash
npm run auth:migrate
```

Restart `npm run dev` after a migrate.

## Configure the SQLite path

Set `AUTH_DATABASE_PATH` in `.env.local` if you do not want the default file. Relative paths are resolved from the project root.

```bash
# Default
AUTH_DATABASE_PATH=data/auth.sqlite

# Another local file
AUTH_DATABASE_PATH=data/auth-dev.sqlite
```

Then:

```bash
npm run auth:migrate
```

SQLite is the right default for local development. It is a file on disk, so it will not persist on typical serverless hosts (for example Vercel). Use PostgreSQL or MySQL for that.

## Switch to PostgreSQL or MySQL

Better Auth accepts a Node driver pool in the `database` option of [`lib/auth.js`](../lib/auth.js). Replace the SQLite client only. Keep `secret`, `baseURL`, `socialProviders`, and `plugins` as they are.

### PostgreSQL

```bash
npm install pg
```

```js
import { Pool } from "pg";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // ...providers and plugins unchanged
});
```

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
```

### MySQL

```bash
npm install mysql2
```

```js
import { createPool } from "mysql2/promise";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,
  database: createPool(process.env.DATABASE_URL),
  // ...providers and plugins unchanged
});
```

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DB_NAME
```

After switching drivers, run:

```bash
npm run auth:migrate
```

That command reads [`lib/auth.js`](../lib/auth.js) and applies the Better Auth schema to whichever database you configured.

Prisma, Drizzle, and other adapters are documented at [Better Auth databases](https://www.better-auth.com/docs/concepts/database). This project uses the built-in Kysely adapter so `npm run auth:migrate` works without an ORM.

Disconnect deletes the Better Auth user row (and provider tokens), then signs out. That keeps GitHub and GitLab as a single connection: the leftover account from one provider cannot block the other with `account_not_linked`.

GitHub and GitLab are trusted for account linking, so signing in with the same email after a previous provider still works if a user row is left behind.

## What stays on the server

The GitHub/GitLab access token is stored encrypted on the `account` row (`account.encryptOAuthTokens: true`). Server code reads it with `auth.api.getAccessToken`. It is not sent to the browser.

## Related

- OAuth app credentials: [oauth-setup.md](oauth-setup.md)
- App architecture: [implementation.md](implementation.md)
