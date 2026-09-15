import { marquee } from "@/lib/content";

/**
 * A thin travelling band directly under the hero.
 *
 * This is where the hero's badge pills went. They are ambient facts — true,
 * worth saying, worth repeating, and not worth a line of the first screen —
 * which is exactly the content a scrolling strip is honest about carrying.
 * The personal message stays still, in the ticket above; only this moves.
 *
 * No JavaScript: the track is one CSS animation over two identical copies of
 * the list, translated by half its width, so the loop has no seam. The second
 * copy exists only to fill the gap and is hidden from assistive tech, which
 * reads the first as an ordinary list.
 */
export function AmbientMarquee() {
  return (
    <div
      aria-label={marquee.label}
      className="relative isolate overflow-hidden border-y border-ink-900/8 bg-cream-50 py-2.5"
    >
      {/* the ends fade rather than cut, so items arrive and leave instead of
          appearing at an edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-cream-50 to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-cream-50 to-transparent sm:w-24"
      />

      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {marquee.items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-5 whitespace-nowrap px-5 text-[0.7rem] tracking-wide text-ink-500 sm:gap-7 sm:px-7 sm:text-xs"
              >
                {item}
                <span aria-hidden className="text-gold-500/70">
                  ✦
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
