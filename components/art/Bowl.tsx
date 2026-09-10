type Tone = "dark" | "berry" | "caramel" | "cream";

const TONES: Record<
  Tone,
  { base: string[]; layer: string; cream: string; garnish: string; sauce: string }
> = {
  dark: {
    base: ["#7a4a26", "#4e2c14", "#2c1808"],
    layer: "#e8d3b6",
    cream: "#fbf3e6",
    garnish: "#3a1f0d",
    sauce: "#412209",
  },
  berry: {
    base: ["#c96b83", "#a04560", "#6d2439"],
    layer: "#fbe4e9",
    cream: "#fff7f8",
    garnish: "#8e2340",
    sauce: "#7a1f38",
  },
  caramel: {
    base: ["#d9a45c", "#b57a31", "#7d4d16"],
    layer: "#fbeed6",
    cream: "#fff8ec",
    garnish: "#7a4d13",
    sauce: "#8a5a1c",
  },
  cream: {
    base: ["#f0e2cb", "#dcc7a6", "#ac9370"],
    layer: "#fffaf0",
    cream: "#fffdf8",
    garnish: "#4a3620",
    sauce: "#5a3d1f",
  },
};

/**
 * A dessert bowl, hand-built in SVG: a glass tumbler with layered filling,
 * a piped cream peak, a wafer roll and chocolate curl garnish, and a sauce
 * drizzle over the cream. Stands in for the photographed bowls.
 */
export function Bowl({
  tone = "dark",
  label,
  width = 260,
  className = "",
  id = tone,
  spoon = false,
  pour = false,
}: {
  tone?: Tone;
  label?: string;
  width?: number;
  className?: string;
  id?: string;
  spoon?: boolean;
  /** draws a sauce stream pouring in from above, in the bowl's own
   *  coordinate space — so it always lands in the cream, at any size */
  pour?: boolean;
}) {
  const t = TONES[tone];

  // extending the viewBox upward keeps the bowl bottom-anchored while the
  // stream rises out of frame
  const viewBox = pour ? "0 -150 240 419" : "0 0 240 269";
  const ratio = pour ? 419 / 240 : 1.12;

  // the piped cream peak, biggest at the rim and tapering upward
  const swirl: [number, number, number, number][] = [
    // cx, cy, rx, ry
    [120, 99, 60, 17],
    [118, 85, 46, 14],
    [122, 73, 33, 11],
    [120, 63, 21, 8],
  ];

  return (
    <svg
      width={width}
      height={width * ratio}
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={label ? `${label} dessert bowl` : "Dessert bowl"}
    >
      <defs>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="16%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="84%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.92" />
        </linearGradient>

        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={t.base[2]} />
          <stop offset="24%" stopColor={t.base[1]} />
          <stop offset="52%" stopColor={t.base[0]} />
          <stop offset="80%" stopColor={t.base[1]} />
          <stop offset="100%" stopColor={t.base[2]} />
        </linearGradient>

        <linearGradient id={`cream-${id}`} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor={t.cream} />
          <stop offset="100%" stopColor="#e9dac2" />
        </linearGradient>

        <linearGradient id={`wafer-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a3743f" />
          <stop offset="45%" stopColor="#d8ab6e" />
          <stop offset="100%" stopColor="#8a5c2c" />
        </linearGradient>

        <linearGradient id={`spoon-${id}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#b58a3c" />
          <stop offset="42%" stopColor="#f0d79a" />
          <stop offset="100%" stopColor="#a97d33" />
        </linearGradient>

        <linearGradient id={`pour-${id}`} x1="0.75" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#8a5427" stopOpacity="0.55" />
          <stop offset="18%" stopColor="#7a4a22" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#543014" />
          <stop offset="100%" stopColor={t.sauce} />
        </linearGradient>

        <clipPath id={`cup-${id}`}>
          <path d="M46 96 H194 L178 232 Q175 250 156 250 H84 Q65 250 62 232 Z" />
        </clipPath>

        <filter id={`crumb-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="4" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 0 0.04  0 0 0 0.45 0"
          />
        </filter>
      </defs>

      <ellipse cx="120" cy="250" rx="66" ry="10" fill="#4f2c16" opacity="0.15" />

      {/* ── filling, clipped to the glass ── */}
      <g clipPath={`url(#cup-${id})`}>
        <rect x="40" y="126" width="160" height="134" fill={`url(#fill-${id})`} />
        <rect x="40" y="126" width="160" height="134" filter={`url(#crumb-${id})`} opacity="0.35" />

        {/* a pale cream stratum, so it reads as layered dessert */}
        <path d="M40 172 Q120 160 200 172 L200 198 Q120 186 40 198 Z" fill={t.layer} opacity="0.85" />
        {/* darker sauce settled at the bottom */}
        <path d="M40 224 Q120 214 200 224 L200 260 L40 260 Z" fill={t.sauce} opacity="0.55" />
        {/* surface of the filling, just under the cream */}
        <ellipse cx="120" cy="128" rx="76" ry="13" fill={t.base[0]} />
        <ellipse cx="120" cy="127" rx="62" ry="9" fill={t.sauce} opacity="0.5" />
      </g>

      {/* ── piped cream peak ── */}
      <g>
        {swirl.map(([cx, cy, rx, ry], i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#cream-${id})`} />
            <path
              d={`M ${cx - rx * 0.8} ${cy - ry * 0.1} Q ${cx - rx * 0.3} ${cy - ry * 1.05} ${cx + rx * 0.25} ${cy - ry * 0.75}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={3.2 - i * 0.5}
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
        ))}
        {/* the tip */}
        <path d="M112 60 Q120 44 130 54 Q126 60 120 62 Z" fill={`url(#cream-${id})`} />
      </g>

      {/* ── sauce drizzled over the cream ── */}
      <path
        d="M72 94 Q94 82 112 90 Q132 98 148 86 Q158 79 168 84"
        fill="none"
        stroke={t.sauce}
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M92 82 Q110 73 132 82"
        fill="none"
        stroke={t.sauce}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* ── garnish: a wafer roll and a chocolate curl ── */}
      <g transform="rotate(18 150 70)">
        <rect x="145" y="24" width="11" height="52" rx="5.5" fill={`url(#wafer-${id})`} />
        <ellipse cx="150.5" cy="25" rx="5.5" ry="2.4" fill="#f0cf9d" />
      </g>
      <path
        d="M92 76 Q78 62 84 46 Q92 58 96 70"
        fill={t.garnish}
        opacity="0.9"
      />
      <circle cx="134" cy="70" r="4" fill={t.garnish} opacity="0.85" />
      <circle cx="106" cy="66" r="3" fill={t.garnish} opacity="0.7" />

      {/* ── sauce pouring in from above ── */}
      {pour && (
        <g>
          {/* a thin, curved, glossy stream — a straight thick bar reads as a stick */}
          <path
            d="M119 62
               C 128 18, 139 -30, 163 -84
               C 173 -108, 184 -130, 193 -150
               L 202 -150
               C 193 -128, 183 -105, 173 -81
               C 150 -27, 137 20, 129 62 Z"
            fill={`url(#pour-${id})`}
          />
          <path
            d="M123 58 C 132 16, 143 -30, 166 -82 C 176 -106, 186 -128, 195 -148"
            fill="none"
            stroke="#ffe9cc"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* impact splash where it meets the cream */}
          <ellipse cx="124" cy="64" rx="19" ry="5.5" fill={t.sauce} opacity="0.7" />
          <ellipse cx="124" cy="62" rx="11" ry="3.2" fill={t.sauce} opacity="0.85" />

          {/* droplets flicking off the stream */}
          {[
            [101, 44, 3.4],
            [148, 22, 2.8],
            [92, 16, 2.2],
            [158, -22, 2.4],
            [108, -12, 1.9],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={t.sauce} opacity={0.65 - i * 0.08} />
          ))}
        </g>
      )}

      {/* ── glass over everything ── */}
      <path
        d="M46 96 H194 L178 232 Q175 250 156 250 H84 Q65 250 62 232 Z"
        fill={`url(#glass-${id})`}
      />
      <path
        d="M46 96 H194 L178 232 Q175 250 156 250 H84 Q65 250 62 232 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        opacity="0.8"
      />
      <ellipse cx="120" cy="96" rx="74" ry="12" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
      <path
        d="M64 108 Q60 170 74 224"
        stroke="#ffffff"
        strokeWidth="6"
        fill="none"
        opacity="0.45"
        strokeLinecap="round"
      />

      {/* ── long dessert spoon, leaning on the rim ── */}
      {spoon && (
        <g transform="rotate(16 196 130)">
          <rect x="192" y="46" width="6" height="104" rx="3" fill={`url(#spoon-${id})`} />
          <ellipse cx="195" cy="38" rx="8.5" ry="13" fill={`url(#spoon-${id})`} />
          <ellipse cx="194" cy="36" rx="5" ry="8.5" fill="#8f6626" opacity="0.35" />
        </g>
      )}
    </svg>
  );
}
