import { reviews } from "@/lib/content";

/**
 * The Google rating, as stars plus the number, linking to the listing it
 * comes from — social proof you can't check is worth very little.
 *
 * Reads "4.9 (254)" — the count is the number of ratings left on the
 * listing, so it is never mistaken for the number of people served.
 *
 * The stars are decorative: `reviews.aria` states the whole claim in one
 * sentence, so a screen reader says "rated 4.9 out of 5 from 254 Google
 * reviews" instead of counting stars. The last star is clipped to the
 * fractional part, so 4.9 shows nine tenths of a star rather than rounding
 * up to a perfect five.
 */
export function Rating({
  className = "",
  starSize = 13,
  /** hide the "Google reviews" source line where space is tight */
  detail = true,
}: {
  className?: string;
  starSize?: number;
  detail?: boolean;
}) {
  return (
    <a
      href={reviews.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={reviews.aria}
      /* whitespace-nowrap is load-bearing: "4.9 (254) · Google reviews" reads
         as one fact and must stay on one line. Squeezed into a narrow flex
         parent the spans would otherwise each wrap, which turns a rating into
         a small paragraph. Callers are responsible for giving it the ~240px
         it needs at 12px. */
      className={`-my-3 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap transition-colors sm:gap-2 hover:text-gold-600 sm:my-0 sm:min-h-0 ${className}`}
    >
      <Stars size={starSize} />
      <span className="font-medium">
        {reviews.rating} ({reviews.count})
      </span>
      {detail && (
        <>
          {/* the separator is decoration; at 360px those ~11px are the
              difference between one comfortable line and a squeezed one */}
          <span aria-hidden className="hidden text-muted sm:inline">
            ·
          </span>
          <span className="text-muted">{reviews.source}</span>
        </>
      )}
    </a>
  );
}

function Stars({ size }: { size: number }) {
  const filled = Math.floor(reviews.rating);
  const partial = reviews.rating - filled;

  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-px">
      {Array.from({ length: reviews.outOf }, (_, i) => {
        // how much of this star is gold: all of it, none of it, or the remainder
        const fill = i < filled ? 1 : i === filled ? partial : 0;
        return (
          <span
            key={i}
            className="relative inline-block shrink-0"
            style={{ width: size, height: size }}
          >
            <Star size={size} className="text-ink-900/15" />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="text-gold-500" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function Star({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className}>
      <path
        fill="currentColor"
        d="M10 1.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.8l-5.2 2.8 1-5.9L1.5 7.6l5.9-.8L10 1.4Z"
      />
    </svg>
  );
}
