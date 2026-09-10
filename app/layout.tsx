import type { Metadata } from "next";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/700-italic.css";
import "@fontsource/playfair-display/500-italic.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./globals.css";
import { brand } from "@/lib/content";
import { CartProvider } from "@/components/cart/CartContext";

const description =
  "Handcrafted chocolate dessert bowls and waffles, made fresh to order at the Paris Bites dessert cart in Aundh, Pune. Open daily from 5 PM.";

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
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
