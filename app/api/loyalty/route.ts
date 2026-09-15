import { NextResponse } from "next/server";

import { snapshotForPhone } from "@/lib/loyalty/service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Where a customer stands.
 *
 * Keyed by phone number with no verification, which is a deliberate trade
 * (see the Bite Club notes): the number is the identity, and progress is not
 * worth stealing — knowing someone's count does not let you spend their
 * reward, because that takes an order staff confirm against the number that
 * actually messaged them. Nothing identifying is returned beyond the name the
 * customer themselves typed.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimit(request, "loyalty", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const phone = new URL(request.url).searchParams.get("phone") ?? "";
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const snapshot = await snapshotForPhone(phone);
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "no-store" },
  });
}
