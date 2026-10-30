import { describe, expect, it, vi } from "vitest";
import { buildGitAuthClientOptions, createGitAuthClient } from "./client.js";

vi.mock("better-auth/react", () => ({
  createAuthClient: (options) => ({ kind: "auth-client", options }),
}));

describe("buildGitAuthClientOptions", () => {
  it("defaults to same-origin with no extra options", () => {
    expect(buildGitAuthClientOptions()).toEqual({});
  });

  it("passes a remote baseURL", () => {
    expect(
      buildGitAuthClientOptions({
        baseURL: "https://auth.example",
      }),
    ).toEqual({
      baseURL: "https://auth.example",
    });
  });

  it("adds the Expo plugin when expo is enabled", () => {
    const expoClient = vi.fn((opts) => ({ id: "expo", opts }));

    expect(
      buildGitAuthClientOptions({
        baseURL: "https://auth.example",
        expo: true,
        expoOptions: { scheme: "myapp" },
        expoClient,
      }),
    ).toEqual({
      baseURL: "https://auth.example",
      plugins: [{ id: "expo", opts: { scheme: "myapp" } }],
    });
    expect(expoClient).toHaveBeenCalledWith({ scheme: "myapp" });
  });

  it("passes an Expo options object through to expoClient", () => {
    const expoClient = vi.fn((opts) => ({ id: "expo", opts }));
    const expo = { scheme: "myapp", storage: { getItem: () => null } };

    expect(
      buildGitAuthClientOptions({
        expo,
        expoClient,
      }).plugins[0],
    ).toEqual({ id: "expo", opts: expo });
  });

  it("throws if expo is enabled without expoClient", () => {
    expect(() => buildGitAuthClientOptions({ expo: true })).toThrow(
      /expoClient from @better-auth\/expo\/client/,
    );
  });
});

describe("createGitAuthClient", () => {
  it("creates a same-origin Better Auth React client", () => {
    expect(createGitAuthClient()).toEqual({
      kind: "auth-client",
      options: {},
    });
  });

  it("creates a remote client with a baseURL", () => {
    expect(createGitAuthClient({ baseURL: "https://auth.example" })).toEqual({
      kind: "auth-client",
      options: { baseURL: "https://auth.example" },
    });
  });
});
