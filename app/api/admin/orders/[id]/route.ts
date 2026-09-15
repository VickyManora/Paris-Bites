import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/session";
import { cancelOrder, confirmOrder } from "@/lib/loyalty/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff confirm, cancel or refund an order.
 *
 * This is the only route in the system that can advance a loyalty journey,
 * and it is behind the admin cookie. The underlying operations are
 * idempotent, so a double-tapped button on a phone in a busy shop cannot
 * award two Bites.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };

  try {
    if (action === "complete") {
      const result = await confirmOrder(id);
      return NextResponse.json({
        ok: true,
        counted: result.counted,
        completedOrders: result.state.completedOrders,
        message: result.message,
      });
    }

    if (action === "cancel" || action === "refund") {
      const result = await cancelOrder(id, action === "refund" ? "refunded" : "cancelled");
      return NextResponse.json({ ok: true, completedOrders: result.state.completedOrders });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
}
