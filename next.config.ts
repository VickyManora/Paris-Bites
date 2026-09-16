import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // no build/route overlay in front of a customer-facing page
  devIndicators: false,

  /* Declaring Turbopack, even empty, is what lets `next dev` start.
     @serwist/next attaches a webpack config, and Next 16 refuses to run its
     Turbopack dev server beside one unless we say we meant it. We do: the
     service worker is deliberately disabled in development — a worker that
     caches your edits and hides them is no help — so in dev that webpack
     config has nothing to do. The production build opts back into webpack
     explicitly (`next build --webpack`), which is where the worker is
     actually built. */
  turbopack: {},

  experimental: {
    /* Connectivity awareness for the UI. Next listens for online/offline,
       notices when a navigation or prefetch fetch fails, and polls with
       backoff — which is why `useOffline()` is trustworthy where
       `navigator.onLine` is not: that only reports whether a network
       interface is up, and says "online" on café WiFi with no internet
       behind it. The cart uses it to decide whether an order can be placed.

       This does NOT make a cold page load work offline; the service worker
       below does that. The two are separate jobs. */
    useOffline: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        /* The one file that must never be cached by the browser. A service
           worker is sticky by design: ship a broken one with a long max-age
           and it keeps serving itself, and customers cannot get the fix. */
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

/**
 * Serwist builds the precache manifest at build time.
 *
 * That is the whole reason for the dependency: JS chunk filenames are
 * content-hashed and change on every build, so the list of things to
 * precache cannot be written by hand — it has to be generated from the
 * build output. Everything else in app/sw.ts is ours.
 */
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // a service worker in `next dev` caches your edits and hides them from you
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,

  /* PRECACHE THE SHELL, NOT THE SHOP.
     Serwist's default patterns sweep all of .next/static and all of the
     public directory, which here meant 145 files and 6.4MB — every bowl
     photograph and both copies of every font. A customer on a weak signal
     would pay that up front for a feature whose entire purpose is to help
     them on a weak signal.

     Two things go. The photographs: nothing ever requests them from
     `public/` anyway, because every image is a static import served from
     `/_next/static/media`, and app/sw.ts caches those as they are actually
     viewed. And the legacy `.woff` faces, which no browser new enough to
     run a service worker will ever ask for.

     Two different knobs, because the files arrive by two different routes:
     `globPublicPatterns` filters the public directory, `exclude` filters
     what the bundler emitted. */
  globPublicPatterns: ["!**/*.{png,jpg,jpeg,webp,avif,gif,ico}"],
  exclude: [/\.woff$/, /\.map$/, /\.(png|jpe?g|gif|webp|avif|ico)$/],

  /* The one document that must be in the cache before it is needed.
     This plugin precaches what the bundler emitted, which is never HTML —
     so /~offline would be missing at the exact moment it exists to cover.
     Every other page caches itself on first visit through the network-first
     rule in app/sw.ts, which is enough: installing a service worker means
     having visited at least once.

     The revision changes per deploy so the fallback cannot go stale. */
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
    },
  ],
});

export default withSerwist(nextConfig);
