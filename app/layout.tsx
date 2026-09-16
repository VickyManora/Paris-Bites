import type { Metadata, Viewport } from "next";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/700-italic.css";
import "@fontsource/playfair-display/500-italic.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./globals.css";
import { brand, installedApp } from "@/lib/content";
import { CartProvider } from "@/components/cart/CartContext";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";

// one sentence, shared with the manifest so the two cannot drift apart
const description = brand.description;

/* Link previews need ABSOLUTE image URLs — WhatsApp, Instagram and X all
   fetch og:image on their own servers, where a relative path means nothing.
   So the live origin has to be known at build time: set NEXT_PUBLIC_SITE_URL
   in the deployment. Vercel's own production URL is the fallback, and
   localhost is last so `next dev` still renders something. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/**
 * `viewportFit: "cover"` is what lets the page paint behind an iPhone's notch
 * and home indicator once the app is installed and there is no browser
 * chrome to sit under them. It hands us the safe-area insets in exchange —
 * see `.safe-*` in globals.css for where they are spent.
 *
 * Zoom is deliberately left alone. Locking it would be one line, and it would
 * take a magnifier away from anyone who needs one to read a price.
 */
export const viewport: Viewport = {
  themeColor: installedApp.theme,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  title: {
    default: `${brand.name} — Chocolate Dessert Bowls & Waffles in ${brand.area}, ${brand.city}`,
    template: `%s · ${brand.name}`,
  },
  description,
  applicationName: brand.name,
  openGraph: {
    type: "website",
    url: "/",
    siteName: brand.name,
    locale: "en_IN",
    title: `${brand.name} — ${brand.descriptor}`,
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
  /* iOS does not read the manifest for this: without it, a home-screen
     launch opens in Safari's chrome instead of standalone. */
  appleWebApp: {
    capable: true,
    title: installedApp.shortName,
    statusBarStyle: "default",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
