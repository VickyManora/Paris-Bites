type Kind = "chocolate" | "hazelnut";

/** A chocolate shard or a hazelnut — the drifting confetti of the page. */
export function Chunk({
  kind = "chocolate",
  size = 34,
  rotate = 0,
  className = "",
  id = "0",
}: {
  kind?: Kind;
  size?: number;
  rotate?: number;
  className?: string;
  id?: string;
}) {
  if (kind === "hazelnut") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        className={className}
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-hidden
      >
        <defs>
          <radialGradient id={`hz-${id}`} cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#d3a26a" />
            <stop offset="55%" stopColor="#a06f3c" />
            <stop offset="100%" stopColor="#5d3a1a" />
          </radialGradient>
        </defs>
        <path
          d="M30 6c12 0 21 9 21 21 0 14-9 27-21 27S9 41 9 27C9 15 18 6 30 6Z"
          fill={`url(#hz-${id})`}
        />
        <path d="M30 12c-5 10-5 26 0 40" stroke="#4a2c12" strokeWidth="2.4" fill="none" opacity="0.5" />
        <ellipse cx="22" cy="18" rx="7" ry="4" fill="#efd0a8" opacity="0.4" />
      </svg>
    );
  }

  // chocolate shard — a chipped square with a lit top facet
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`ch-${id}`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#7a4a26" />
          <stop offset="52%" stopColor="#4e2c14" />
          <stop offset="100%" stopColor="#2c170a" />
        </linearGradient>
      </defs>
      {/* top facet, catching the light */}
      <path d="M8 18 L30 8 L52 18 L30 27 Z" fill="#8d5a30" />
      {/* body */}
      <path d="M8 18 L30 27 L30 52 L8 42 Z" fill={`url(#ch-${id})`} />
      <path d="M52 18 L30 27 L30 52 L52 42 Z" fill="#3a2010" />
      <path d="M8 18 L30 8 L52 18 L30 27 Z" fill="none" stroke="#a97042" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
