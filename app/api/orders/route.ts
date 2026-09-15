import { NextResponse } from "next/server";

import { placeOrder } from "@/lib/loyalty/service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Place an order.
 *
 * The body may contain a name, a phone number, product ids and quantities,
 * and at most one reward id. It may NOT contain prices, discounts, totals or
 * an order count — those are not read even if sent, because the server
 * recomputes all of them from the catalogue and the database.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  phone?: unknown;
  name?: unknown;
  items?: unknown;
  rewardId?: unknown;
  productId?: unknown;
};

export async function POST(request: Request) {
  const limited = rateLimit(request, "orders", { limit: 12, windowMs: 60_000 });
  if (limited) return limited;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone : "";
  const name = typeof body.name === "string" ? body.name : "";

  const items = Array.isArray(body.items)
    ? body.items
        .filter((i): i is { id: string; qty: number } =>
          typeof i === "object" && i !== null && typeof (i as { id?: unknown }).id === "string",
        )
        .map((i) => ({ id: i.id, qty: Number(i.qty) || 0 }))
        .slice(0, 40)
    : [];

  const result = await placeOrder({
    phone,
    name,
    items,
    rewardId: typeof body.rewardId === "string" ? body.rewardId : null,
    productId: typeof body.productId === "string" ? body.productId : null,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
