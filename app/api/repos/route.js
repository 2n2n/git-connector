import { NextResponse } from "next/server";
import { getConnectorSession, listReposForSession } from "@/lib/repos";

export async function GET() {
  const session = await getConnectorSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repos = await listReposForSession(session);
    return NextResponse.json({
      provider: session.provider,
      repos,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list repositories" },
      { status: 502 },
    );
  }
}
