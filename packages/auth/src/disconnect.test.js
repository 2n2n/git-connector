import { describe, expect, it, vi } from "vitest";
import { disconnectGitAuth } from "./disconnect.js";

function createAuth({ user, signOutError } = {}) {
  const deleteUser = vi.fn(async () => {});
  const signOut = vi.fn(async () => {
    if (signOutError) {
      throw signOutError;
    }
  });

  return {
    api: {
      getSession: vi.fn(async () => (user ? { user } : {})),
      signOut,
    },
    $context: Promise.resolve({
      internalAdapter: { deleteUser },
    }),
    deleteUser,
    signOut,
  };
}

const headers = new Headers();

describe("disconnectGitAuth", () => {
  it("does not delete a user when there is no session", async () => {
    const auth = createAuth();

    await disconnectGitAuth(auth, headers);

    expect(auth.deleteUser).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledWith({ headers });
  });

  it("deletes the user then signs out", async () => {
    const auth = createAuth({ user: { id: "user-1" } });

    await disconnectGitAuth(auth, headers);

    expect(auth.deleteUser).toHaveBeenCalledWith("user-1");
    expect(auth.signOut).toHaveBeenCalledWith({ headers });
    expect(auth.deleteUser.mock.invocationCallOrder[0]).toBeLessThan(
      auth.signOut.mock.invocationCallOrder[0],
    );
  });

  it("ignores sign-out errors after the user is deleted", async () => {
    const auth = createAuth({
      user: { id: "user-1" },
      signOutError: new Error("session already gone"),
    });

    await expect(disconnectGitAuth(auth, headers)).resolves.toBeUndefined();
    expect(auth.deleteUser).toHaveBeenCalledWith("user-1");
  });
});
