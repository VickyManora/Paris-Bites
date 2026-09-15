import type { Metadata } from "next";
import Link from "next/link";

import { biteClub, MILESTONES } from "@/lib/loyalty/config";
import { brand } from "@/lib/content";
import { BiteClubCard } from "@/components/loyalty/BiteClubCard";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Choco } from "@/components/art/Choco";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: `${biteClub.fullName} | Exclusive Dessert Rewards`,
  description:
    "Join the Paris Bites Bite Club and earn exclusive rewards when you order your favourite chocolate desserts and bowls directly from our website.",
  alternates: { canonical: "/bite-club" },
  openGraph: {
    title: `${biteClub.fullName} — ${biteClub.tagline}`,
    description: biteClub.pitch,
  },
};

export default function BiteClubPage() {
  return (
    <>
      <Nav />
      <main className="warm-glow grain relative isolate overflow-hidden bg-cream-100 pt-32 pb-24 sm:pt-40">
        <div className="relative z-[1] mx-auto max-w-[900px] px-5 sm:px-8">
          <Reveal className="text-center">
            <p className="kicker mb-5">{biteClub.exclusive}</p>
            <h1 className="display text-[clamp(2.2rem,6vw,3.6rem)]">
              {biteClub.name} <span className="text-gold-500">♡</span>
              <span className="accent block italic">{biteClub.promise}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed text-ink-500 sm:text-base">
              {biteClub.pitch}
            </p>
            <p className="mx-auto mt-3 text-xs text-muted">{biteClub.automatic}</p>
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <BiteClubCard />
          </Reveal>

          {/* the ladder as plain content, so it is in the HTML for a reader
              who has not entered a number — and for search */}
          <Reveal delay={0.15} className="mt-14">
            <h2 className="display text-center text-2xl">How the journey works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {MILESTONES.map((m) => (
                <li key={m.n} className="card rounded-2xl p-5">
                  <p className="kicker">{m.label}</p>
                  <p className="display mt-2 text-lg">{m.short}</p>
                  <p className="mt-1 text-sm text-ink-500">{m.detail}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.2} className="mt-14 flex flex-col items-center text-center">
            <Choco
              pose="heart"
              float="bob"
              sizes="(max-width: 640px) 40vw, 180px"
              className="w-[40%] max-w-[180px]"
            />
            <p className="mt-6 max-w-[44ch] text-sm text-ink-500">
              Rewards are earned on orders placed here on the website and confirmed by our
              team at the cart in {brand.area}, {brand.city}.
            </p>
            <Link
              href="/#menu"
              className="mt-6 rounded-full bg-ink-900 px-7 py-3.5 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
            >
              Start with the menu
            </Link>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
