export const DEFAULT_GITHUB_SCOPES = ["repo"];
export const DEFAULT_GITLAB_SCOPES = ["api"];
export const DEFAULT_ERROR_URL = "http://localhost:3000";
export const DEFAULT_SQLITE_PATH = "data/auth.sqlite";
export const SOCIAL_PROVIDERS = new Set(["github", "gitlab"]);

export function mapGitLabProfileToUser(profile) {
  return {
    emailVerified: Boolean(profile?.email_verified || profile?.confirmed_at),
  };
}

export function resolveGitAuthEnv(options = {}, env = process.env) {
  return {
    secret: options.secret ?? env.AUTH_SECRET,
    baseURL: options.baseURL ?? env.AUTH_URL,
    errorURL: options.errorURL ?? env.AUTH_URL ?? DEFAULT_ERROR_URL,
    sqlitePath: options.sqlitePath ?? env.AUTH_DATABASE_PATH ?? DEFAULT_SQLITE_PATH,
    github: {
      clientId: options.github?.clientId ?? env.AUTH_GITHUB_ID,
      clientSecret: options.github?.clientSecret ?? env.AUTH_GITHUB_SECRET,
      scope: options.github?.scope ?? DEFAULT_GITHUB_SCOPES,
    },
    gitlab: {
      clientId: options.gitlab?.clientId ?? env.AUTH_GITLAB_ID,
      clientSecret: options.gitlab?.clientSecret ?? env.AUTH_GITLAB_SECRET,
      scope: options.gitlab?.scope ?? DEFAULT_GITLAB_SCOPES,
    },
    expo: options.expo !== false,
    nextCookies: options.nextCookies !== false,
    trustedOrigins: options.trustedOrigins,
    database: options.database,
    nodeEnv: options.nodeEnv ?? env.NODE_ENV,
  };
}

export function resolveTrustedOrigins({
  baseURL,
  trustedOrigins,
  expo = true,
  nodeEnv,
} = {}) {
  if (trustedOrigins) {
    return trustedOrigins.filter(Boolean);
  }

  const origins = [baseURL];

  if (expo && nodeEnv === "development") {
    origins.push("exp://", "exp://**");
  }

  return origins.filter(Boolean);
}

export function buildSocialProviders({ github, gitlab } = {}) {
  return {
    github: {
      clientId: github?.clientId,
      clientSecret: github?.clientSecret,
      scope: github?.scope ?? DEFAULT_GITHUB_SCOPES,
    },
    gitlab: {
      clientId: gitlab?.clientId,
      clientSecret: gitlab?.clientSecret,
      scope: gitlab?.scope ?? DEFAULT_GITLAB_SCOPES,
      mapProfileToUser: mapGitLabProfileToUser,
    },
  };
}

export function buildGitAuthOptions(options = {}, env = process.env) {
  const resolved = resolveGitAuthEnv(options, env);

  return {
    secret: resolved.secret,
    baseURL: resolved.baseURL,
    database: resolved.database,
    sqlitePath: resolved.sqlitePath,
    trustedOrigins: resolveTrustedOrigins(resolved),
    socialProviders: buildSocialProviders(resolved),
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["github", "gitlab"],
        requireLocalEmailVerified: false,
      },
    },
    onAPIError: {
      errorURL: resolved.errorURL,
    },
    pluginFlags: {
      expo: resolved.expo,
      nextCookies: resolved.nextCookies,
    },
  };
}
