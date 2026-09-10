import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { brand, nav, reviews, share } from "@/lib/content";

/**
 * The card WhatsApp, Instagram, X and Slack draw when the URL is shared.
 *
 * 1200x630 is the size every one of them crops from, so the important
 * things — the logo, the headline, the rating — stay well inside the middle,
 * where even an aggressive square crop keeps them.
 *
 * WhatsApp is the channel that matters here, and it silently drops the image
 * altogether past roughly 300KB. ImageResponse only emits PNG, which pins
 * two decisions: the mascot instead of a photograph of the cart (flat art
 * costs a fraction of a photograph), and a flat cream ground instead of the
 * site's blush gradient (the ramp alone cost 73KB). The card lands at ~245KB.
 *
 * The page is statically prerendered, so this runs once at build time: the
 * fonts and artwork are read straight off disk and inlined, and nothing here
 * costs anything at request time.
 */
export const alt = `${brand.name} — ${share.headline} in ${brand.area}, ${brand.city}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const file = (path: string) => readFile(join(process.cwd(), path));

export default async function OpenGraphImage() {
  const [logo, choco, playfair, poppins, poppinsMedium] = await Promise.all([
    file("public/brand/logo-lockup.png"),
    file("public/choco/choco-bowl.png"),
    file("node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff"),
    file("node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff"),
    file("node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff"),
  ]);

  const inline = (buffer: Buffer, mime: string) =>
    `data:${mime};base64,${buffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#faf8f5",
          fontFamily: "Poppins",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 0 0 76px",
            width: 780,
          }}
        >
          <img alt="" src={inline(logo, "image/png")} width={392} height={253} />

          <div
            style={{
              display: "flex",
              fontFamily: "Playfair Display",
              fontSize: 52,
              lineHeight: 1.1,
              color: "#241713",
              marginTop: 24,
              maxWidth: 620,
            }}
          >
            {share.headline}
          </div>

          <div style={{ display: "flex", fontSize: 25, color: "#6f574d", marginTop: 16 }}>
            {share.sub}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 30 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#fffdfb",
                border: "1px solid rgba(36,23,19,0.08)",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 22,
                fontWeight: 500,
                color: "#4a332b",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" style={{ marginRight: 10 }}>
                <path
                  fill="#c79a4b"
                  d="M10 1.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.8l-5.2 2.8 1-5.9L1.5 7.6l5.9-.8L10 1.4Z"
                />
              </svg>
              {`${reviews.rating} (${reviews.count})`}
            </div>

            <div style={{ display: "flex", fontSize: 22, color: "#9c8479", marginLeft: 20 }}>
              {`${brand.area}, ${brand.city} · ${nav.hours}`}
            </div>
          </div>
        </div>

        {/* Choco rather than a photograph of the cart: the preview has to stay
            under WhatsApp's ~300KB or it silently shows no image at all, and
            flat mascot art compresses to a fraction of a photograph's PNG. */}
        <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
          <img alt="" src={inline(choco, "image/png")} width={301} height={349} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Playfair Display", data: playfair, weight: 700, style: "normal" },
        { name: "Poppins", data: poppins, weight: 400, style: "normal" },
        { name: "Poppins", data: poppinsMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
