import { SOCIAL_PROVIDERS } from "./options.js";

export async function getGitSession(auth, headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    return null;
  }

  const accounts = await auth.api.listUserAccounts({ headers });
  const socialAccounts = (accounts ?? []).filter((account) =>
    SOCIAL_PROVIDERS.has(account.providerId),
  );

  if (socialAccounts.length === 0) {
    return null;
  }

  socialAccounts.sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const account = socialAccounts[0];
  let token;

  try {
    token = await auth.api.getAccessToken({
      body: { accountId: account.id },
      headers,
    });
  } catch {
    return null;
  }

  if (!token?.accessToken) {
    return null;
  }

  return {
    user: session.user,
    provider: account.providerId,
    accessToken: token.accessToken,
  };
}
