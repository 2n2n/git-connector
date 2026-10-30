import { describe, expect, it } from "vitest";
import {
  DEFAULT_GITHUB_SCOPES,
  DEFAULT_GITLAB_SCOPES,
  buildGitAuthOptions,
  mapGitLabProfileToUser,
} from "./options.js";

const credentials = {
  secret: "test-secret",
  baseURL: "http://localhost:3000",
  github: { clientId: "gh-id", clientSecret: "gh-secret" },
  gitlab: { clientId: "gl-id", clientSecret: "gl-secret" },
};

describe("buildGitAuthOptions", () => {
  it("configures GitHub and GitLab with encrypted tokens and account linking", () => {
    const options = buildGitAuthOptions(
      {
        ...credentials,
        database: { kind: "custom" },
        nodeEnv: "production",
      },
      {},
    );

    expect(options.secret).toBe("test-secret");
    expect(options.baseURL).toBe("http://localhost:3000");
    expect(options.database).toEqual({ kind: "custom" });
    expect(options.socialProviders.github).toMatchObject({
      clientId: "gh-id",
      clientSecret: "gh-secret",
      scope: DEFAULT_GITHUB_SCOPES,
    });
    expect(options.socialProviders.gitlab).toMatchObject({
      clientId: "gl-id",
      clientSecret: "gl-secret",
      scope: DEFAULT_GITLAB_SCOPES,
    });
    expect(options.account.encryptOAuthTokens).toBe(true);
    expect(options.account.accountLinking).toEqual({
      enabled: true,
      trustedProviders: ["github", "gitlab"],
      requireLocalEmailVerified: false,
    });
    expect(options.pluginFlags).toEqual({ expo: true, nextCookies: true });
  });

  it("reads credentials from env when options omit them", () => {
    const options = buildGitAuthOptions(
      { database: {} },
      {
        AUTH_SECRET: "from-env",
        AUTH_URL: "https://auth.example",
        AUTH_GITHUB_ID: "env-gh",
        AUTH_GITHUB_SECRET: "env-ghs",
        AUTH_GITLAB_ID: "env-gl",
        AUTH_GITLAB_SECRET: "env-gls",
        AUTH_DATABASE_PATH: "tmp/from-env.sqlite",
      },
    );

    expect(options.secret).toBe("from-env");
    expect(options.baseURL).toBe("https://auth.example");
    expect(options.sqlitePath).toBe("tmp/from-env.sqlite");
    expect(options.socialProviders.github.clientId).toBe("env-gh");
    expect(options.socialProviders.gitlab.clientId).toBe("env-gl");
    expect(options.onAPIError.errorURL).toBe("https://auth.example");
  });

  it("adds Expo trusted origins in development and omits them in production", () => {
    const development = buildGitAuthOptions(
      { ...credentials, nodeEnv: "development" },
      {},
    );
    const production = buildGitAuthOptions(
      { ...credentials, nodeEnv: "production" },
      {},
    );

    expect(development.trustedOrigins).toEqual([
      "http://localhost:3000",
      "exp://",
      "exp://**",
    ]);
    expect(production.trustedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("turns Expo and nextCookies plugins off when requested", () => {
    const options = buildGitAuthOptions(
      {
        ...credentials,
        expo: false,
        nextCookies: false,
        nodeEnv: "development",
      },
      {},
    );

    expect(options.pluginFlags).toEqual({ expo: false, nextCookies: false });
    expect(options.trustedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("keeps a custom database and records the sqlite path when none is passed", () => {
    const withDatabase = buildGitAuthOptions(
      { ...credentials, database: { pool: true } },
      {},
    );
    const withSqlitePath = buildGitAuthOptions(
      { ...credentials, sqlitePath: "tmp/custom.sqlite" },
      {},
    );

    expect(withDatabase.database).toEqual({ pool: true });
    expect(withSqlitePath.database).toBeUndefined();
    expect(withSqlitePath.sqlitePath).toBe("tmp/custom.sqlite");
  });

  it("uses custom scopes and trusted origins when provided", () => {
    const options = buildGitAuthOptions(
      {
        ...credentials,
        github: { ...credentials.github, scope: ["read:user", "repo"] },
        gitlab: { ...credentials.gitlab, scope: ["read_user", "read_api"] },
        trustedOrigins: ["https://app.example", null],
      },
      {},
    );

    expect(options.socialProviders.github.scope).toEqual(["read:user", "repo"]);
    expect(options.socialProviders.gitlab.scope).toEqual([
      "read_user",
      "read_api",
    ]);
    expect(options.trustedOrigins).toEqual(["https://app.example"]);
  });
});

describe("mapGitLabProfileToUser", () => {
  it("marks the email verified from GitLab profile fields", () => {
    expect(mapGitLabProfileToUser({ confirmed_at: "2026-01-01" })).toEqual({
      emailVerified: true,
    });
    expect(mapGitLabProfileToUser({ email_verified: false })).toEqual({
      emailVerified: false,
    });
  });
});
