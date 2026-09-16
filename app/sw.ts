/// <reference lib="webworker" />

/**
 * ─────────────────────────────────────────────────────────────
 *  THE SERVICE WORKER — what makes Paris Bites survive a dead
 *  signal on a street in Aundh.
 *
 *  The menu, the prices, the photographs and the cart are all
 *  compiled into the bundle, so once these files are cached the
 *  whole shop works with no network at all. Only placing the
 *  order and reading Bite Club progress need a server.
 *
 *  THE RULE THAT MATTERS: prices are in the bundle, so a stale
 *  cached page is a stale PRICE LIST. Documents are therefore
 *  network-first — a customer with a connection always sees
 *  today's prices, and the cache is only ever a fallback for
 *  when the network fails. Nothing here may become cache-first
 *  without someone deciding that serving last month's prices is
 *  acceptable.
 * ─────────────────────────────────────────────────────────────
 */
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    /** injected at build time by @serwist/next — the hashed asset list */
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const YEAR = 60 * 60 * 24 * 365;
const MONTH = 60 * 60 * 24 * 30;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,

  /* Deliberately NOT skipWaiting/clientsClaim. A worker that seizes control
     mid-session can hand an already-rendered page a different build's
     chunks, and the page dies on a chunk it cannot load. The new worker
     activates on the next launch instead. Content freshness does not depend
     on this, because documents are network-first either way. */
  skipWaiting: false,
  clientsClaim: false,

  navigationPreload: true,

  runtimeCaching: [
    {
      /* Ordering, loyalty status and the staff order queue. Never cached,
         never served stale: a cached order queue would have staff handing
         out bowls against an order that was already confirmed. */
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // the staff panel is a live view of the business; it has no offline story
      matcher: ({ url }) => url.pathname.startsWith("/admin"),
      handler: new NetworkOnly(),
    },
    {
      /* Documents and the RSC payloads behind client-side navigation. Cache
         both or `<Link>` to /bite-club breaks offline even with its HTML
         cached. Three seconds is long enough for a slow evening 4G and short
         enough that a dead connection does not feel like a hang. */
      matcher: ({ request, url }) =>
        request.destination === "document" ||
        request.headers.get("RSC") === "1" ||
        url.pathname.endsWith(".rsc"),
      handler: new NetworkFirst({
        cacheName: "pb-pages",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: MONTH })],
      }),
    },
    {
      /* Hashed build output — the filename changes whenever the contents do,
         so this can be cached hard and forever without any staleness risk. */
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "pb-static",
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: YEAR })],
      }),
    },
    {
      /* Product photography, both the raw media files and the /_next/image
         variants. Capped: the full set is ~4.3MB and there is no reason to
         hold every size of every bowl on a customer's phone forever. */
      matcher: ({ url, request }) =>
        request.destination === "image" || url.pathname.startsWith("/_next/image"),
      handler: new CacheFirst({
        cacheName: "pb-images",
        plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: MONTH })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new CacheFirst({
        cacheName: "pb-fonts",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: YEAR })],
      }),
    },
  ],

  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
