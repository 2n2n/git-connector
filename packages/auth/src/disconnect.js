export async function disconnectGitAuth(auth, headers) {
  const session = await auth.api.getSession({ headers });

  if (session?.user?.id) {
    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteUser(session.user.id);
  }

  try {
    await auth.api.signOut({ headers });
  } catch {
    // Session rows may already be gone after deleteUser.
  }
}
