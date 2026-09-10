/**
 * ─────────────────────────────────────────────────────────────
 *  ALL PARIS BITES COPY LIVES HERE.
 *  Prices, bowls, links, hours — change them here, nowhere else.
 * ─────────────────────────────────────────────────────────────
 */

export const brand = {
  name: "Paris Bites",
  descriptor: "Chocolaterie & Desserts",
  tagline: "Handcrafted desserts made fresh, every day.",
  city: "Pune",
  area: "Aundh",
};

export const links = {
  whatsapp: "https://wa.me/917447360809",
  whatsappNumber: "917447360809",
  instagram: "https://www.instagram.com/parisbitesofficial/",
  maps: "https://maps.app.goo.gl/NvWorxyM6D2BoDHz6",
};

/* ── Google reviews ────────────────────────────────────────
   The live numbers from the Google Business listing. `url` points at the
   listing itself so anyone can check the claim — never state a rating here
   that the listing does not show. Update the rating and the count together.

   `count` is how many people left a rating, which is a much smaller number
   than how many have been served — see hero.stats for that one. The badge
   renders as "4.9 (254)", built from these two fields so the number in the
   copy can never drift from the number here.
   ───────────────────────────────────────────────────────── */
export const reviews = {
  /** out of 5; the fifth star is drawn part-filled, so 4.9 stays 4.9 */
  rating: 4.9,
  outOf: 5,
  /** ratings left on the listing */
  count: 254,
  source: "Google reviews",
  url: links.maps,
  /** the whole claim in one sentence — the stars themselves are decorative */
  aria: "Rated 4.9 out of 5 from 254 Google reviews",
};

/* ── Link preview ──────────────────────────────────────────
   The card WhatsApp, Instagram and X draw when someone shares the URL —
   rendered by app/opengraph-image.tsx. Keep the headline to roughly 40
   characters; past that it starts crowding the cart photo beside it.
   ───────────────────────────────────────────────────────── */
export const share = {
  headline: "Chocolate dessert bowls & waffles",
  sub: "Made fresh to order, every evening",
};

export const nav = {
  links: [
    { label: "Home", href: "#home" },
    { label: "Why Us", href: "#why" },
    { label: "Menu", href: "#menu" },
    { label: "Waffles", href: "#waffles" },
    { label: "Visit", href: "#visit" },
  ],
  hours: "Open daily from 5 PM",
};

export const hero = {
  // one line per row; `accent` renders in italic gold
  headline: [
    { text: "Paris vibes", accent: false },
    { text: "on your street", accent: true },
  ],
  body: "Street desserts, crafted with Parisian love. Every bowl is made fresh, using quality ingredients and a lot of love.",
  badges: ["Prepared fresh after you order", "Loved by chocolate lovers in Aundh"],
  cta: "View menu",
  secondaryCta: "Visit us today",
  stats: [
    { value: "2500+", label: "Customers served" },
    { value: "5 PM", label: "Doors open" },
    { value: "8", label: "Signature bowls" },
    { value: "100%", label: "Made to order" },
  ],
};

export const why = {
  kicker: "Why Paris Bites",
  heading: [
    { text: "The difference quality", accent: false },
    { text: "and care make", accent: true },
  ],
  items: [
    {
      n: "1",
      title: "Premium Chocolate",
      body: "Finest Belgian and French chocolate, sourced from the best chocolatiers.",
    },
    {
      n: "2",
      title: "Clean & Hygienic",
      body: "Maintained to the highest standards of cleanliness and food safety.",
    },
    {
      n: "3",
      title: "No Smoking, No Noise",
      body: "A peaceful, family-friendly environment for everyone to enjoy.",
    },
    {
      n: "4",
      title: "Evening Dessert Spot",
      body: "Perfect place to unwind with sweet treats after a long day.",
    },
  ],
  cta: "See the bowls",
};

/* ── Menu ──────────────────────────────────────────────────
   `combo` is the price for any TWO bowls from that category.
   It is applied automatically in the cart — see lib/pricing.ts.
   ───────────────────────────────────────────────────────── */

export type Bowl = {
  id: string;
  name: string;
  note: string;
  price: number;
  badge?: string;
  tone: "dark" | "berry" | "caramel" | "cream";
};

export type Category = {
  id: string;
  title: string;
  serves: string;
  /** price for any TWO items from this category; omit for no combo offer */
  combo?: number;
  items: Bowl[];
};

export const menu = {
  kicker: "The menu",
  heading: [
    { text: "Our signature", accent: false },
    { text: "desserts", accent: true },
  ],
  body: "Handcrafted with love, served with elegance. Prepared fresh after you order.",
  special: "Today's special: Biscoff Delight",
  firstTime: "First time at Paris Bites? Start with Nutella Bliss or Death by Chocolate.",
  currency: "₹",
  categories: [
    {
      id: "signature",
      title: "Signature Bowls",
      serves: "Serves 1 · Rich & filling",
      combo: 299,
      items: [
        {
          id: "death-by-chocolate",
          name: "Death by Chocolate",
          note: "Rich dark chocolate bowl with brownie chunks, chocolate sauce & whipped cream",
          price: 149,
          badge: "Bestseller",
          tone: "dark",
        },
        {
          id: "oreo-licious",
          name: "Oreo Licious Bowl",
          note: "Crushed Oreos with vanilla cream and chocolate fudge",
          price: 159,
          badge: "Most loved",
          tone: "cream",
        },
        {
          id: "kitkat-break",
          name: "KitKat Break Bowl",
          note: "Crunchy KitKat pieces with chocolate mousse and caramel",
          price: 169,
          tone: "caramel",
        },
      ],
    },
    {
      id: "premium",
      title: "Premium Bowls",
      serves: "Serves 1 · Indulgent & luxurious",
      combo: 399,
      items: [
        {
          id: "tiramisu",
          name: "Tiramisu Indulgence",
          note: "Coffee-soaked ladyfingers with mascarpone cream and cocoa dust",
          price: 199,
          badge: "Signature",
          tone: "cream",
        },
        {
          id: "strawberry-bliss",
          name: "Strawberry Chocolate Bliss",
          note: "Fresh strawberries with chocolate cream and berry compote",
          price: 219,
          tone: "berry",
        },
        {
          id: "biscoff-delight",
          name: "Biscoff Delight Bowl",
          note: "Biscoff cookie butter bowl with caramel swirls and cookie crumbles",
          price: 229,
          tone: "caramel",
        },
        {
          id: "blueberry-bliss",
          name: "Blueberry Chocolate Bliss",
          note: "Fresh blueberries with chocolate cream and white chocolate",
          price: 229,
          tone: "berry",
        },
        {
          id: "nutella-bliss",
          name: "Nutella Bliss Bowl",
          note: "Creamy Nutella base with hazelnut crunch and chocolate drizzle",
          price: 239,
          tone: "dark",
        },
      ],
    },
  ] satisfies Category[],
  comboNote: "Combo deals are applied automatically when you add 2 bowls from the same category.",
};

/* ── Waffles ───────────────────────────────────────────────
   A category in its own right, so the cart and the WhatsApp
   order message treat waffles exactly like bowls. No `combo`
   here — the 2-for offer is a bowls promotion only.

   `image` is the slug in lib/waffle-images.ts. A waffle with no
   entry there renders the "photo coming soon" card rather than
   borrowing another product's photograph.
   ───────────────────────────────────────────────────────── */
export const waffles = {
  kicker: "Freshly pressed",
  heading: [
    { text: "Paris Bites", accent: false },
    { text: "waffles", accent: true },
  ],
  body: "Crispy, chocolatey & made to melt your heart. Pressed to order and layered while still warm.",
  category: {
    id: "waffles",
    title: "Waffles",
    serves: "Serves 1 · Pressed to order",
    items: [
      {
        id: "waffle-death-by-chocolate",
        name: "Death by Chocolate",
        note: "Cocoa waffle layered with dark chocolate and vanilla cream.",
        price: 149,
        tone: "dark" as const,
      },
      {
        id: "waffle-kitkat-break",
        name: "KitKat Break",
        note: "Cocoa waffle stacked with KitKat fingers and chocolate spread.",
        price: 159,
        tone: "caramel" as const,
      },
      {
        id: "waffle-strawberry-bliss",
        name: "Strawberry Bliss",
        note: "Strawberry waffle layered with fresh strawberries and vanilla cream.",
        price: 169,
        tone: "berry" as const,
      },
      {
        id: "waffle-blueberry-dream",
        name: "Blueberry Dream",
        note: "Golden waffle layered with fresh blueberries and cream.",
        price: 169,
        tone: "berry" as const,
      },
      {
        id: "waffle-nutella-indulgence",
        name: "Nutella Indulgence",
        note: "Cocoa waffle folded over layers of hazelnut chocolate spread.",
        price: 189,
        tone: "dark" as const,
      },
      {
        id: "waffle-biscoff-bliss",
        name: "Biscoff Bliss",
        note: "Golden waffle layered with Biscoff spread and biscuit crumb.",
        price: 189,
        tone: "caramel" as const,
      },
    ],
  },
  comingSoon: "Photo coming soon",
};

export const visit = {
  kicker: "Visit us",
  heading: [
    { text: "Find the cart", accent: false },
    { text: "in Aundh", accent: true },
  ],
  body: "A premium dessert cart experience — not a dine-in café. Walk-in friendly, no reservation needed.",
  details: [
    {
      title: "Where",
      lines: [
        "Near Nexus Westend Mall, Aundh",
        "Pune",
        "For exact spot click on GET DIRECTION below",
      ],
    },
    {
      title: "When",
      lines: [
        "Open from 5 PM onwards",
        "Every day of the week",
        "Fresh batches, limited quantity",
      ],
    },
  ],
  /** describes the actual photograph, for screen readers and for search */
  cartAlt:
    "The Paris Bites dessert cart in Aundh, Pune — a white cart with a pink and white striped awning and a gold Paris Bites sign, lit up in the evening.",
  cartCaption: "Look for the pink striped awning",
  /** names the landmarks drawn on the artwork, for screen readers and search */
  mapAlt:
    "Illustrated map of Aundh, Pune showing the Paris Bites dessert cart on Nagras Road, near Nexus Westend Mall, The White House, D-Mart Aundh, New DP Road and the Mula River.",
  mapCta: "Open in Google Maps",
  landmarkNote: "Just minutes from Nexus Westend Mall and The White House.",
  /** the one line someone reads out to a driver */
  address: "Near Nexus Westend Mall, Aundh, Pune",
  hoursTitle: "Open from 5 PM onwards",
  hoursLines: ["Every day of the week", "Fresh batches, limited quantity"],
  /* closes the section — the invitation, not another set of facts */
  ctaBody:
    "Just minutes from Nexus Westend Mall, with something delicious waiting for you.",
  instagramHandle: "@parisbitesofficial",
  ctaHeading: [
    { text: "Come find us.", accent: false },
    { text: "Something sweet is waiting.", accent: true },
  ],
  /** three reasons to make the trip, each already true elsewhere on the page */
  highlights: [
    { icon: "route" as const, title: "Easy to reach", body: "Near Nexus Westend Mall & The White House" },
    { icon: "clock" as const, title: "Open daily", body: "From 5 PM onwards" },
    { icon: "heart" as const, title: "Freshly made", body: "Small batches, big happiness" },
  ],
  /* CTA order is the hierarchy: directions is the job of this section,
     WhatsApp is how people actually order, Instagram is a nice-to-have. */
  mapsCta: "Get Directions",
  whatsappCta: "WhatsApp Us",
  instagramCta: "Follow Us on Instagram",
};

export const cart = {
  title: "Your order",
  empty: "Your cart is empty.",
  emptyHint: "Add a bowl to get started.",
  nameLabel: "Your name",
  namePlaceholder: "Name for the order",
  submit: "Order on WhatsApp",
  note: "We'll confirm within minutes. No login, no payment upfront.",
  savings: "Combo saving",
  total: "Total",
};

export const footer = {
  compliance: "FSSAI compliant · Hygienically prepared · Made fresh daily",
  columns: [
    { title: "Explore", links: [{ label: "Why us", href: "#why" }, { label: "Menu", href: "#menu" }, { label: "Waffles", href: "#waffles" }, { label: "Visit", href: "#visit" }] },
  ],
  credit: "Crafted with care in Pune",
};
