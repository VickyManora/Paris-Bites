"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";

import { install } from "@/lib/content";
import { ease } from "../motion/Reveal";

/**
 * The invitation to keep Paris Bites on the home screen.
 *
 * Shown in one place only — the screen a customer sees straight after
 * sending an order. They have just committed, and their Bite Club journey
 * has just moved; that is the one moment the answer is plausibly yes. A
 * banner on the menu would be dismissed without being read.
 *
 * Two platforms, two mechanics. Chrome fires `beforeinstallprompt`, which we
 * keep and replay on a tap. Safari fires nothing and offers no API, so iOS
 * gets told how to do it by hand instead of a button that cannot work.
 *
 * It renders nothing when the app is already installed, when the customer
 * has said no, or in a desktop browser with no prompt to give.
 *
 * Written as an external store rather than state loaded in an effect,
 * because that is what it is: Chrome fires the event once and early, often
 * before this component mounts — and sometimes after. A subscription catches
 * both; a mount-time read catches neither reliably.
 */

/** the event Chrome fires; not in TypeScript's DOM lib */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "hidden" | "prompt" | "ios";

const DISMISSED_KEY = "paris-bites:install:v1";

let deferred: InstallEvent | null = null;
let mode: Mode = "hidden";
const listeners = new Set<() => void>();

function alreadyInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS reports it here instead of through display-mode
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // private mode: they will be asked again next time, which is acceptable
  }
}

function compute(): Mode {
  if (alreadyInstalled() || wasDismissed()) return "hidden";
  if (deferred) return "prompt";
  if (isIosSafari()) return "ios";
  return "hidden";
}

function emit() {
  mode = compute();
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  mode = compute();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep Chrome's own mini-infobar out of the way
    deferred = event as InstallEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    remember();
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => mode;
const getServerSnapshot = (): Mode => "hidden";

export function InstallPrompt() {
  const reduce = useReducedMotion();
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (current === "hidden") return null;

  async function accept() {
    const event = deferred;
    remember(); // asked once, whatever they answer
    deferred = null;
    emit();

    if (!event) return;
    await event.prompt();
    await event.userChoice;
  }

  function decline() {
    remember();
    emit();
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3, ease }}
      className="mt-7 w-full rounded-2xl border border-gold-500/25 bg-blush-100/70 p-4 text-left"
    >
      <p className="text-sm font-semibold text-ink-900">{install.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">
        {current === "ios" ? install.iosBody : install.body}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {current === "prompt" && (
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-ink-900 px-5 py-2.5 text-xs font-medium text-cream-50 transition-colors hover:bg-gold-600"
          >
            {install.action}
          </button>
        )}

        <button
          type="button"
          onClick={decline}
          className="px-2 py-2.5 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
        >
          {install.dismiss}
        </button>
      </div>
    </motion.div>
  );
}
