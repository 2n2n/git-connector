import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  clearTargetCookie,
  getTarget,
  setTargetCookie,
} from "@/lib/target";

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = await getTarget();
  return NextResponse.json({ target });
}

export async function POST(request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const target = await setTargetCookie(body);
    return NextResponse.json({ target });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Invalid repository" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearTargetCookie();
  return NextResponse.json({ target: null });
}
