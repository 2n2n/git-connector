import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { nextCookies } from "better-auth/next-js";
import { buildGitAuthOptions } from "./options.js";
import { createSqliteDatabase } from "./sqlite.js";

export { buildGitAuthOptions, mapGitLabProfileToUser, SOCIAL_PROVIDERS } from "./options.js";
export { createSqliteDatabase, resetSqliteDatabaseCache } from "./sqlite.js";
export { getGitSession } from "./session.js";
export { disconnectGitAuth } from "./disconnect.js";

export function createGitAuth(options = {}) {
  const {
    sqlitePath,
    pluginFlags,
    database,
    ...config
  } = buildGitAuthOptions(options);

  const plugins = [];
  if (pluginFlags.expo) {
    plugins.push(expo());
  }
  if (pluginFlags.nextCookies) {
    plugins.push(nextCookies());
  }

  return betterAuth({
    ...config,
    database: database ?? createSqliteDatabase(sqlitePath),
    plugins,
  });
}
