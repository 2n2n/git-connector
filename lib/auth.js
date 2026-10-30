import fs from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

const dbPath = path.resolve(
  process.cwd(),
  process.env.AUTH_DATABASE_PATH || "data/auth.sqlite",
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalForAuth = globalThis;

function getDatabase() {
  if (!globalForAuth.__authDb) {
    globalForAuth.__authDb = new Database(dbPath);
  }

  return globalForAuth.__authDb;
}

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,
  database: getDatabase(),
  trustedOrigins: [
    process.env.AUTH_URL,
    ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ].filter(Boolean),
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      scope: ["repo"],
    },
    gitlab: {
      clientId: process.env.AUTH_GITLAB_ID,
      clientSecret: process.env.AUTH_GITLAB_SECRET,
      scope: ["read_api"],
    },
  },
  account: { encryptOAuthTokens: true },
  plugins: [expo(), nextCookies()],
});
