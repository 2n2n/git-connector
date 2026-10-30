import { createAuthClient } from "better-auth/react";

export function buildGitAuthClientOptions(options = {}) {
  const clientOptions = {};

  if (options.baseURL) {
    clientOptions.baseURL = options.baseURL;
  }

  const plugins = [...(options.plugins ?? [])];

  if (options.expo) {
    if (typeof options.expoClient !== "function") {
      throw new Error(
        "createGitAuthClient({ expo: true }) requires expoClient from @better-auth/expo/client so web bundles do not import Expo.",
      );
    }

    const expoOptions =
      options.expo === true ? (options.expoOptions ?? {}) : options.expo;
    plugins.push(options.expoClient(expoOptions));
  }

  if (plugins.length > 0) {
    clientOptions.plugins = plugins;
  }

  return clientOptions;
}

export function createGitAuthClient(options = {}) {
  return createAuthClient(buildGitAuthClientOptions(options));
}
