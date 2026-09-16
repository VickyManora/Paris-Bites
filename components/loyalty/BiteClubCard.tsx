"use client";

import { useState, useSyncExternalStore } from "react";

import { JOURNEY_LENGTH, biteClub } from "@/lib/loyalty/config";
import {
  rememberPhone,
  rememberedPhone,
  serverPhone,
  subscribePhone,
  useLoyalty,
} from "@/lib/loyalty/client";
import { properName } from "@/lib/names";
import { BiteJourney } from "./BiteJourney";

/**
 * The dashboard card: where a customer stands, and what happens next.
 *
 * The phone number is the account, so the card has two states — ask for the
 * number, or show the journey. The number is remembered in this browser
 * purely so nobody types it twice; it is not the source of truth for
 * anything. Progress always comes from the server, which is why clearing
 * storage or switching phones loses nothing but the convenience.
 */
export function BiteClubCard({ compact = false }: { compact?: boolean }) {
  /* The remembered number is an external store, so a returning customer sees
     their journey on the first render instead of the sign-in form. */
  const phone = useSyncExternalStore(subscribePhone, rememberedPhone, serverPhone);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* One shared lookup for the whole page — see lib/loyalty/client.ts. */
  const { snapshot, status } = useLoyalty(phone);
  const loading = status === "loading" && !snapshot;
  const failed = status === "error" && !snapshot;

  function look(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = input.trim();
    if (cleaned.replace(/\D/g, "").length < 10) {
      setError("Enter the mobile number you order with.");
      return;
    }
    setError(null);
    rememberPhone(cleaned);
  }

  if (!phone) {
    return (
      <div className="card rounded-3xl p-7 sm:p-9">
        <Header />
        <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-ink-500">
          {biteClub.pitch}
        </p>
        <p className="mt-2 text-sm text-ink-500">{biteClub.lookupHint}</p>

        <form onSubmit={look} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Your WhatsApp number</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Your WhatsApp number"
              className="w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-ink-900 px-7 py-3.5 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
          >
            {biteClub.lookupCta}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-gold-600">{error}</p>}
        <p className="mt-3 text-[0.7rem] text-muted">
          {biteClub.automatic} We use your number to keep your journey — on any phone, any
          browser.
        </p>
      </div>
    );
  }

  return (
    <div className="card rounded-3xl p-7 sm:p-9">
      <Header />

      {loading ? (
        <JourneySkeleton />
      ) : failed ? (
        <p className="mt-8 text-sm text-muted">
          Couldn&apos;t load your journey. Try again in a moment.
        </p>
      ) : snapshot ? (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {/* "Welcome back" to someone who has never ordered is a small
                  lie, and the first thing they read. Nobody is "back" until a
                  Bite has actually been earned — before that the card greets
                  them and says where the journey starts. */}
              <p className="text-sm text-ink-500">
                {snapshot.state.completedOrders === 0
                  ? snapshot.customer?.name
                    ? `Welcome, ${properName(snapshot.customer.name)}`
                    : "Welcome to Bite Club"
                  : snapshot.customer?.name
                    ? `Welcome back, ${properName(snapshot.customer.name)}`
                    : "Welcome back"}
              </p>
              <p className="display mt-1 text-3xl">
                {snapshot.state.completedOrders}
                <span className="text-lg text-muted"> / 6 Bites</span>
              </p>
            </div>

            {snapshot.state.completedOrders < JOURNEY_LENGTH && snapshot.next ? (
              <div className="text-right">
                <p className="kicker">{biteClub.nextRewardLabel}</p>
                <p className="mt-1 text-sm font-medium text-ink-900">{snapshot.next.short}</p>
                <p className="text-xs text-muted">
                  {snapshot.next.ordersAway === 1
                    ? "1 more order"
                    : `${snapshot.next.ordersAway} more orders`}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-gold-600">{biteClub.completeHeadline}</p>
            )}
          </div>

          {snapshot.offer && (
            <div className="mt-6 rounded-2xl border border-fresh-500/30 bg-fresh-100 px-5 py-4">
              <p className="text-sm font-semibold text-ink-900">
                🎁 {snapshot.offer.label} is ready
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {snapshot.offer.detail} — apply it in your cart on your next order.
              </p>
            </div>
          )}

          <div className="mt-8">
            <BiteJourney journey={snapshot.journey} />
          </div>

          {!compact && snapshot.history.length > 0 && (
            <div className="mt-9 border-t border-ink-900/10 pt-6">
              <p className="kicker mb-4">{biteClub.historyTitle}</p>
              <ul className="space-y-2.5">
                {snapshot.history.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-4 text-sm">
                    <span className="min-w-0 text-ink-700">{entry.description}</span>
                    <time
                      dateTime={entry.at}
                      className="shrink-0 text-xs text-muted tabular-nums"
                    >
                      {new Date(entry.at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              rememberPhone("");
              setInput("");
            }}
            className="mt-7 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
          >
            Use a different number
          </button>
        </>
      ) : (
        <p className="mt-8 text-sm text-gold-600">{error}</p>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-blush-100 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold-600">
        {biteClub.exclusive}
      </span>
      <h2 className="display mt-4 text-[clamp(1.6rem,4vw,2.4rem)]">{biteClub.fullName}</h2>
      <p className="accent mt-1 text-sm font-medium">{biteClub.tagline}</p>
    </div>
  );
}

/**
 * The card's shape while the server is being asked.
 *
 * Built from the same blocks as the real thing — a greeting, a count, the
 * next reward, six markers — so the card does not jump when the answer
 * lands. It says "checking" rather than drawing a zero: a customer on their
 * 4th Bite seeing "0 / 6" for half a second is the one thing this card
 * cannot afford to get wrong.
 */
function JourneySkeleton() {
  return (
    <>
      <div className="mt-6 animate-pulse" aria-hidden>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="h-3.5 w-40 rounded-full bg-ink-900/8" />
            <div className="mt-2.5 h-8 w-32 rounded-lg bg-ink-900/8" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-2.5 w-20 rounded-full bg-ink-900/8" />
            <div className="h-3.5 w-28 rounded-full bg-ink-900/8" />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="size-11 shrink-0 rounded-full bg-ink-900/8" />
          ))}
        </div>
      </div>

      {/* the skeleton is decoration; this is the part that is actually read */}
      <p className="mt-5 text-xs text-muted">{biteClub.checking}</p>
    </>
  );
}
