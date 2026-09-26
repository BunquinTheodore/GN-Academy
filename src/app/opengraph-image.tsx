import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GN Academy: Learn. Prove. Get hired.";

const WORDMARK = "GN ACADEMY";
const EYEBROW = "VERIFIED CREDENTIALS · PHILIPPINES";
const SUBTITLE = "Learn. Prove. Get hired.";

const BRAND_LIME = "#C8F048";
const PAPER = "#F5F7FA";
const MUTED = "#8FA3BF";
// Resolved from this site's dark-mode --background token,
// oklch(0.21 0.032 258), converted to sRGB hex — satori/ImageResponse
// needs a concrete color, not an oklch() function.
const CANVAS_BG = "#0f1927";

/**
 * Fetches a Google Font as TTF bytes for satori/ImageResponse, which needs
 * real font file bytes rather than a stylesheet URL. Google's CSS2 endpoint
 * only hands back woff2 to modern user agents, so this requests it with an
 * old Android UA to get a ttf URL back, matching the standard Next.js OG
 * image cookbook pattern. `text` narrows the request to only the glyphs
 * actually used, keeping the fetched font small.
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  // `family` already uses Google's "+"-for-space convention (e.g.
  // "Bricolage+Grotesque") and must NOT be run through encodeURIComponent,
  // which would escape the "+" to "%2B" and break family resolution.
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(
    text,
  )}`;

  const css = await fetch(cssUrl, {
    headers: {
      // Legacy Safari UA (no woff/woff2 support) so Google serves back a
      // format('truetype') src instead of woff2 or an svg font.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_5_8; en-us) AppleWebKit/533.16 (KHTML, like Gecko) Version/4.1 Safari/533.16",
    },
  }).then((res) => res.text());

  const fontUrlMatch = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!fontUrlMatch) {
    throw new Error(`Could not resolve a font file URL for ${family} ${weight}`);
  }

  const fontRes = await fetch(fontUrlMatch[1]);
  return fontRes.arrayBuffer();
}

/**
 * Sitewide social-share card. Mirrors the "house style" used across the
 * client's other sites (small letter-spaced eyebrow, large centered
 * wordmark, muted subtitle) but built from GN Academy's own real brand
 * tokens — lime accent, near-black navy canvas, Bricolage Grotesque display
 * face. Per-route OG images (certifications, blog, ai-test results) shadow
 * this file automatically on their own routes per Next.js conventions —
 * this only renders on pages with no more specific opengraph-image.
 */
export default async function OgImage() {
  const [bricolageBold, interBold, interMedium] = await Promise.all([
    loadGoogleFont("Bricolage+Grotesque", 700, WORDMARK),
    loadGoogleFont("Inter", 700, EYEBROW),
    loadGoogleFont("Inter", 500, SUBTITLE),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: CANVAS_BG,
          display: "flex",
          height: "100%",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Subtle brand-lime glow behind the centered content, for depth. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(circle at 50% 50%, rgba(200,240,72,0.16) 0%, rgba(200,240,72,0) 60%)`,
          }}
        />

        {/* Thin full-height brand-lime bar on the left edge. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 8,
            background: BRAND_LIME,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "0 96px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: BRAND_LIME,
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            {EYEBROW}
          </div>

          <div
            style={{
              display: "flex",
              color: PAPER,
              fontFamily: "Bricolage Grotesque",
              fontWeight: 700,
              fontSize: 90,
              lineHeight: 1.1,
              marginTop: 26,
              textAlign: "center",
            }}
          >
            {WORDMARK}
          </div>

          <div
            style={{
              display: "flex",
              color: MUTED,
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: 30,
              marginTop: 24,
              maxWidth: 760,
              textAlign: "center",
            }}
          >
            {SUBTITLE}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: bricolageBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Inter",
          data: interBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Inter",
          data: interMedium,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
