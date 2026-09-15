import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sign-in for a two-person admin panel.
 *
 * One shared password in an environment variable, and a cookie signed with a
 * secret — no auth library, no user table, no password reset flow, because
 * the panel has exactly two users who sit in the same shop. If that ever
 * stops being true, replace this file; nothing else knows how it works.
 *
 * The cookie carries an expiry and an HMAC of it. It is httpOnly (so no
 * script can read it), sameSite=lax (so another site cannot post with it)
 * and secure in production.
 */
const COOKIE = "pb_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // a long shift, then sign in again

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 16)
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 16 characters");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** constant-time, so a wrong password cannot be found one character at a time */
function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return equal(input, expected);
}

export async function startSession() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expires);
  const jar = await cookies();

  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** true only for a cookie this server signed, and that has not expired */
export async function isSignedIn(): Promise<boolean> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return false;

    const [payload, signature] = raw.split(".");
    if (!payload || !signature) return false;
    if (!equal(signature, sign(payload))) return false;

    return Number(payload) > Date.now();
  } catch {
    // a missing secret must read as "not signed in", never as "signed in"
    return false;
  }
}

/** for route handlers: 401 unless the caller is staff */
export async function requireAdmin(): Promise<Response | null> {
  if (await isSignedIn()) return null;
  return Response.json({ error: "Not signed in" }, { status: 401 });
}
