"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { clearTargetCookie, setTargetCookie } from "@/lib/target";

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function disconnect() {
  await clearTargetCookie();
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
}

export async function selectTarget(repo) {
  await requireUser();
  await setTargetCookie(repo);
  revalidatePath("/dashboard");
}

export async function clearTarget() {
  await requireUser();
  await clearTargetCookie();
  revalidatePath("/dashboard");
}
