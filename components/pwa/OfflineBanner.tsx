"use client";

import { useOffline } from "next/offline";

import { cart as copy } from "@/lib/content";

/**
 * A thin line across the top when the connection is gone.
 *
 * It exists so the cart's refusal to place an order is never a surprise: by
 * the time someone reaches the Order button they have already been told why
 * it will not work. Nothing else on the site needs a connection — the menu,
 * the prices and the cart are all local — so this is deliberately quiet
 * rather than an alarm.
 *
 * `role="status"` rather than `alert`: it is information, not an emergency,
 * and a screen reader should finish its sentence first.
 */
export function OfflineBanner() {
  const offline = useOffline();

  if (!offline) return null;

  return (
    <div
      role="status"
      className="safe-top fixed inset-x-0 top-0 z-[100] bg-ink-900/95 px-4 py-2 text-center text-xs font-medium text-cream-50 backdrop-blur-sm"
    >
      {copy.offlineTitle} · {copy.offlineBody}
    </div>
  );
}
