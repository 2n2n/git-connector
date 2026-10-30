import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ConnectButtons } from "@/components/ConnectButtons";
import { getConnectorSession } from "@/lib/repos";

function HomeShell({ children }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-zinc-950">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Git connector
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Connect GitHub or GitLab
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Sign in with OAuth 2.0, list the repositories you can access, and
          pick one as the targeted repository.
        </p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

async function ConnectPanel() {
  const session = await getConnectorSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return <ConnectButtons />;
}

export default function Home() {
  return (
    <HomeShell>
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Checking session…</p>
        }
      >
        <ConnectPanel />
      </Suspense>
    </HomeShell>
  );
}
