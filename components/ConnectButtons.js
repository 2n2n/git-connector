"use client";

import { useSearchParams } from "next/navigation";
import { GitHubIcon, GitLabIcon } from "@/components/Icons";
import { authClient } from "@/lib/auth-client";

const AUTH_ERRORS = {
  account_not_linked:
    "This email is already connected with a different provider. Disconnect that account, then try GitHub or GitLab again.",
};

function connect(provider) {
  return authClient.signIn.social({
    provider,
    callbackURL: "/dashboard",
  });
}

function authErrorMessage(code) {
  if (!code) {
    return null;
  }

  return AUTH_ERRORS[code] || `Could not connect: ${code.replaceAll("_", " ")}.`;
}

export function ConnectButtons() {
  const searchParams = useSearchParams();
  const error = authErrorMessage(searchParams.get("error"));

  return (
    <div className="flex w-full flex-col gap-3">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => connect("github")}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#24292f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1b1f23]"
        >
          <GitHubIcon />
          Connect GitHub
        </button>
        <button
          type="button"
          onClick={() => connect("gitlab")}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fc6d26] px-5 text-sm font-medium text-white transition-colors hover:bg-[#e24329]"
        >
          <GitLabIcon />
          Connect GitLab
        </button>
      </div>
    </div>
  );
}
