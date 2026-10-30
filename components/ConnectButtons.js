"use client";

import { GitHubIcon, GitLabIcon } from "@/components/Icons";
import { authClient } from "@/lib/auth-client";

function connect(provider) {
  return authClient.signIn.social({
    provider,
    callbackURL: "/dashboard",
  });
}

export function ConnectButtons() {
  return (
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
  );
}
