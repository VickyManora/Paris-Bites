import "server-only";

import { NextResponse } from "next/server";

/**
 * A small brake on the public endpoints.
 *
 * In-memory and per-instance, which on serverless means it is a speed bump
 * rather than a wall — enough to stop someone walking every phone number in
 * Pune through the progress lookup from one laptop, not enough to stop a
 * botnet. The real protections are elsewhere: progress reveals nothing worth
 * stealing, and a reward can only be spent by the phone that earned it, on an
 * order staff confirm by hand.
 *
 * If this ever needs to be real, swap the Map for Upstash Redis; the call
 * sites do not change.
 */
type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/** best-effort client identity behind Vercel's proxy */
function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(
  request: Request,
  scope: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  const key = clientKey(request, scope);
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || hit.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // keep the map from growing without bound on a long-lived instance
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return null;
  }

  hit.count++;
  if (hit.count > limit) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Give it a moment." },
      { status: 429, headers: { "retry-after": String(Math.ceil((hit.resetAt - now) / 1000)) } },
    );
  }

  return null;
}
