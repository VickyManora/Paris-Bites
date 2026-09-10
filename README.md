# Paris Bites — landing page

A Next.js landing page for **Paris Bites**, Chocolaterie & Desserts (Aundh, Pune).
Built by rebranding a coffee-shop template: same layout, motion and hand-built SVG
technique, restyled to the cream / blush / gold palette and Playfair + Poppins
typography of the live site at paris-bite.vercel.app.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build && npm start` for production.

## Making changes

**All copy, prices and links live in `lib/content.ts`.** Nothing else needs editing
for day-to-day updates.

```ts
export const links = {
  whatsapp: "https://wa.me/917447360809",
  instagram: "https://instagram.com/parisbitesofficial",
  maps: "https://maps.app.goo.gl/NvWorxyM6D2BoDHz6",
};
```

Headings are arrays so one line can carry the italic gold accent:

```ts
headline: [
  { text: "Paris vibes",    accent: false },
  { text: "on your street", accent: true  },  // ← italic gold
]
```

Adding or repricing a bowl means one entry under `menu.categories`:

```ts
{ id: "new-bowl", name: "…", note: "…", price: 199, badge: "New", tone: "berry" }
```

`tone` picks the bowl artwork colourway — `dark`, `berry`, `caramel` or `cream`.
`id` must be unique; the cart keys off it.

**Colours** are CSS custom properties at the top of `app/globals.css`, exposed to
Tailwind via `@theme inline`. Change `--cream-100`, `--gold-500` and `--ink-900`
and the whole page follows.

## The cart

Add-to-cart with quantities, then one handoff to WhatsApp — no backend, no login,
nothing stored.

**Combo pricing** (`lib/pricing.ts`) mirrors the live site: any two bowls from the
same category are charged at that category's `combo` price, applied automatically.
Two details worth knowing:

1. Pairs are formed from the **most expensive** bowls first, so the customer keeps
   the largest saving.
2. The combo is only used when it actually beats paying separately. Two ₹149
   Signature bowls cost ₹298, so the ₹299 combo is correctly *not* applied — the
   guard means a customer can never be charged more by the combo than without it.

`pricing.test.mts` covers both, plus cross-category orders and empty carts:

```bash
npx esbuild pricing.test.mts --bundle --platform=node --format=esm \
  --outfile=/tmp/pt.mjs && node /tmp/pt.mjs
```

The WhatsApp message lists each line at list price, then the combos applied, the
total and the saving, plus the customer's name.

## Structure

```
app/
  layout.tsx        fonts, metadata, CartProvider
  globals.css       palette, typography, surfaces, keyframes
  page.tsx          section order
components/
  Nav.tsx           pill nav, cart button with count, mobile drawer
  Hero.tsx          headline, CTAs, bowls with pour, scroll parallax
  Why.tsx           four points in the numbered layout around a bowl
  Menu.tsx          two categories, add-to-cart, combo banner
  Visit.tsx         where / when, directions, WhatsApp, Instagram
  Footer.tsx        nav columns, hours, oversized wordmark
  art/
    Bowl.tsx        glass tumbler, layered filling, cream peak, garnish,
                    optional sauce pour and spoon; four colourways
    Chunk.tsx       chocolate shard and hazelnut
  cart/
    CartContext.tsx quantities, totals, drawer state
    CartDrawer.tsx  line items, name field, WhatsApp handoff
  motion/
    Reveal.tsx      Reveal / Stagger / RisingLines primitives
lib/
  content.ts        ← all copy, prices, links
  pricing.ts        combo pricing + WhatsApp message
```

## On the artwork

The live site uses photographs of the bowls. Everything here is hand-built in SVG
instead — no image files, nothing to license, sharp at any size. It's a deliberate
stylisation, not an imitation of photography.

To use your real photos: drop them in `public/`, then replace `<Bowl />` in
`components/Hero.tsx` and `components/Menu.tsx` with `next/image`. The parallax
wrappers already handle the motion, so images inherit it for free. The gold script
logo is currently set as type (Playfair italic); swap the wordmark in `Nav.tsx` and
`Footer.tsx` for the real logo file when you want the exact mark.

## Notes

- Fonts are self-hosted via `@fontsource`, so the page makes no external requests.
  The ₹ sign needs Poppins' `latin-ext` subset, which the imported CSS includes.
- Every animation is disabled under `prefers-reduced-motion`.
- No analytics, no cookies, no third-party scripts.
