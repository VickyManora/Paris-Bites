import type { CSSProperties } from "react";

/**
 * The "you are here" marker on a Bite Club ladder: a map pin, drawn in
 * currentColor so the red lives with the circle around it. Sized by the
 * caller — the menu strip's markers are half the size of the journey's.
 */
export function MapPin({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2a6.5 6.5 0 0 0-6.5 6.5c0 4.7 5.62 11.98 5.86 12.29a.82.82 0 0 0 1.28 0c.24-.31 5.86-7.59 5.86-12.29A6.5 6.5 0 0 0 12 2Zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
      />
    </svg>
  );
}
