import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/session";
import { database, hasDatabase } from "@/lib/loyalty/service";
import { ordersForAdmin, type OrderStatus } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** the confirmation queue: pending by default, or a filtered view */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ orders: [] });

  const status = (new URL(request.url).searchParams.get("status") ?? "pending") as
    | OrderStatus
    | "all";

  const orders = await ordersForAdmin(database(), status);
  return NextResponse.json({ orders }, { headers: { "cache-control": "no-store" } });
}
