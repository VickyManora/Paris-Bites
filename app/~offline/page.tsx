import type { Metadata } from "next";

import { brand, visit } from "@/lib/content";
import { Choco } from "@/components/art/Choco";

/**
 * The page shown when a document request fails and nothing is cached.
 *
 * It is deliberately thin. Once the service worker has been round the site
 * even once, the real pages are cached and this is never seen — it exists
 * for the first visit on a dead connection, and for a route nobody has
 * opened before. So it carries the two things worth knowing in that moment:
 * where the cart is, and that the menu is waiting once there is signal.
 */
export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="grain flex min-h-[100svh] flex-col items-center justify-center bg-cream-100 px-6 text-center">
      <Choco
        pose="default"
        float="bob"
        appear="mount"
        sizes="(max-width: 640px) 44vw, 200px"
        className="w-[44%] max-w-[200px]"
      />

      <h1 className="display mt-8 text-2xl">You&apos;re offline</h1>

      <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ink-500">
        No connection right now. Your cart is saved — the menu will be back the moment you
        have signal.
      </p>

      <p className="mt-8 text-xs text-muted">
        {visit.address} · {brand.area}, {brand.city}
      </p>
    </main>
  );
}
