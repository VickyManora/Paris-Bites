import { NextResponse } from "next/server";

import { checkPassword, endSession, isSignedIn, startSession } from "@/lib/admin/session";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ signedIn: await isSignedIn() });
}

/** sign in; rate-limited hard, because this is the one password in the system */
export async function POST(request: Request) {
  const limited = rateLimit(request, "admin-login", { limit: 8, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const { password } = (await request.json().catch(() => ({}))) as { password?: string };

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  await startSession();
  return NextResponse.json({ signedIn: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ signedIn: false });
}
