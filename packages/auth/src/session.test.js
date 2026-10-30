import { describe, expect, it, vi } from "vitest";
import { getGitSession } from "./session.js";

function createAuth({
  user = { id: "user-1", email: "a@example.com" },
  accounts = [],
  accessToken = "token",
  throwOnToken = false,
} = {}) {
  return {
    api: {
      getSession: vi.fn(async () => (user ? { user } : {})),
      listUserAccounts: vi.fn(async () => accounts),
      getAccessToken: vi.fn(async () => {
        if (throwOnToken) {
          throw new Error("missing token");
        }
        return accessToken ? { accessToken } : {};
      }),
    },
  };
}

const headers = new Headers();

describe("getGitSession", () => {
  it("returns null when there is no user", async () => {
    const auth = createAuth({ user: null });

    await expect(getGitSession(auth, headers)).resolves.toBeNull();
    expect(auth.api.listUserAccounts).not.toHaveBeenCalled();
  });

  it("returns null when there is no GitHub or GitLab account", async () => {
    const auth = createAuth({
      accounts: [{ id: "cred", providerId: "credential", updatedAt: "2026-01-01" }],
    });

    await expect(getGitSession(auth, headers)).resolves.toBeNull();
    expect(auth.api.getAccessToken).not.toHaveBeenCalled();
  });

  it("returns null when the access token is missing", async () => {
    const auth = createAuth({
      accounts: [{ id: "gh", providerId: "github", updatedAt: "2026-01-02" }],
      accessToken: null,
    });

    await expect(getGitSession(auth, headers)).resolves.toBeNull();
  });

  it("returns null when reading the access token throws", async () => {
    const auth = createAuth({
      accounts: [{ id: "gh", providerId: "github", updatedAt: "2026-01-02" }],
      throwOnToken: true,
    });

    await expect(getGitSession(auth, headers)).resolves.toBeNull();
  });

  it("returns the newest social account and its access token", async () => {
    const user = { id: "user-1", name: "Ada" };
    const auth = createAuth({
      user,
      accounts: [
        { id: "gl", providerId: "gitlab", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "gh", providerId: "github", updatedAt: "2026-02-01T00:00:00.000Z" },
      ],
      accessToken: "github-token",
    });

    await expect(getGitSession(auth, headers)).resolves.toEqual({
      user,
      provider: "github",
      accessToken: "github-token",
    });
    expect(auth.api.getAccessToken).toHaveBeenCalledWith({
      body: { accountId: "gh" },
      headers,
    });
  });
});
