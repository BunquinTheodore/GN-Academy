/**
 * Draws the certificate onto 2D canvases that the scene uploads as textures.
 *
 * Colours and font stacks are read from the live site tokens (globals.css and
 * the next/font variables on <html>) at draw time, so the paper follows the
 * light/dark theme and the loaded Josefin Sans / Manrope / Geist Mono faces, with no
 * hex values of its own. The layout maths (fit, wrap, date) is in
 * certificate-face-layout.ts and is unit tested; this file is the part that
 * needs a real canvas.
 */

import {
  fitSingleLine,
  fitWrapped,
  formatIssueDate,
  toVerifyLabel,
  type Measure,
} from "./certificate-face-layout";

/** Logical drawing space, A4 landscape at 2x the PDF's points. */
export const FACE_WIDTH = 1684;
export const FACE_HEIGHT = 1190;

const FRAME_INSET = 48;
const FRAME_RADIUS = 36;
const CONTENT_WIDTH = FACE_WIDTH - 2 * (FRAME_INSET + 96);
const CX = FACE_WIDTH / 2;
const PAPER_ALPHA = 0.92;

export type FaceInput = {
  holderName: string;
  title: string;
  level?: string;
  credentialCode: string;
  issuedAt: Date | string;
  verifyUrl: string;
};

export type FaceTheme = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accentText: string;
  accentForeground: string;
  display: string;
  body: string;
  mono: string;
};

export type FaceCanvases = {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
};

// ── Theme ──────────────────────────────────────────────────────────────────

function probe(
  property: "color" | "fontFamily",
  value: string,
  fallback: string,
): string {
  const el = document.createElement("span");
  el.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  el.style[property] = value;
  document.body.appendChild(el);
  try {
    const resolved = getComputedStyle(el)[property];
    return resolved && resolved !== "rgba(0, 0, 0, 0)" ? resolved : fallback;
  } finally {
    el.remove();
  }
}

/** Resolves site tokens to concrete strings a canvas can use. */
export function resolveFaceTheme(): FaceTheme {
  const color = (token: string, fallback: string) =>
    probe("color", `var(${token})`, fallback);
  return {
    paper: color("--card", "white"),
    ink: color("--card-foreground", "black"),
    muted: color("--muted-foreground", "gray"),
    accent: color("--verified", "goldenrod"),
    accentText: color("--verified-text", "goldenrod"),
    accentForeground: color("--verified-foreground", "black"),
    display: probe("fontFamily", "var(--font-display)", "sans-serif"),
    body: probe("fontFamily", "var(--font-sans)", "sans-serif"),
    mono: probe("fontFamily", "var(--font-mono)", "monospace"),
  };
}

/** Waits for the site fonts so the first paint is never in a fallback face. */
export async function waitForFonts(theme: FaceTheme): Promise<void> {
  if (!("fonts" in document)) return;
  const wanted = [
    `300 48px ${theme.display}`,
    `400 24px ${theme.body}`,
    `600 24px ${theme.body}`,
    `600 24px ${theme.mono}`,
  ];
  try {
    await Promise.all(wanted.map((font) => document.fonts.load(font)));
    await document.fonts.ready;
  } catch {
    // A font that fails to load degrades to the fallback stack in `theme`.
  }
}

// ── Drawing helpers ────────────────────────────────────────────────────────

function newCanvas(width: number, height: number, pixelScale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * pixelScale);
  canvas.height = Math.round(height * pixelScale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  ctx.scale(pixelScale, pixelScale);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function measureWith(ctx: CanvasRenderingContext2D, weight: number, family: string): Measure {
  return (text, size) => {
    ctx.font = `${weight} ${size}px ${family}`;
    return ctx.measureText(text).width;
  };
}

/** Centred text with manual letter spacing (ctx.letterSpacing is not universal). */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  tracking: number,
) {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  ctx.textAlign = "left";
  let x = CX - total / 2;
  chars.forEach((char, i) => {
    ctx.fillText(char, x, y);
    thickenLightText(ctx, String(ctx.fillStyle), (cx) => ctx.strokeText(char, cx, y), x);
    x += widths[i] + tracking;
  });
}

function drawCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  fill: string,
) {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = "center";
  ctx.fillText(text, CX, y);
  thickenLightText(ctx, fill, (x) => ctx.strokeText(text, x, y), CX);
}

/** Josefin ships only its Light weight, which turns faint on a textured paper. */
const LIGHT_STROKE_RATIO = 0.028;

function fontSizePx(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  return match ? Number(match[1]) : 0;
}

/**
 * Adds a hairline stroke in the fill colour to Light (weight 300) text, so it
 * reads at a regular weight without shipping another font file. A no-op for
 * every other weight.
 */
function thickenLightText(
  ctx: CanvasRenderingContext2D,
  fill: string,
  stroke: (x: number) => void,
  x: number,
) {
  if (!ctx.font.startsWith("300")) return;
  ctx.save();
  ctx.strokeStyle = fill;
  ctx.lineWidth = fontSizePx(ctx.font) * LIGHT_STROKE_RATIO;
  ctx.lineJoin = "round";
  stroke(x);
  ctx.restore();
}

// ── Paper surface ──────────────────────────────────────────────────────────

function drawPaper(ctx: CanvasRenderingContext2D, theme: FaceTheme) {
  ctx.save();
  roundedRect(ctx, 0, 0, FACE_WIDTH, FACE_HEIGHT, 28);
  ctx.clip();
  ctx.globalAlpha = PAPER_ALPHA;
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);

  // Faint guilloche rings from the top-right corner, like the flat card.
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = theme.accentText;
  ctx.lineWidth = 2;
  for (let r = 80; r < 1500; r += 26) {
    ctx.beginPath();
    ctx.arc(FACE_WIDTH * 1.05, -FACE_HEIGHT * 0.1, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, theme: FaceTheme) {
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  roundedRect(
    ctx,
    FRAME_INSET,
    FRAME_INSET,
    FACE_WIDTH - 2 * FRAME_INSET,
    FACE_HEIGHT - 2 * FRAME_INSET,
    FRAME_RADIUS,
  );
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  roundedRect(
    ctx,
    FRAME_INSET + 14,
    FRAME_INSET + 14,
    FACE_WIDTH - 2 * (FRAME_INSET + 14),
    FACE_HEIGHT - 2 * (FRAME_INSET + 14),
    FRAME_RADIUS - 10,
  );
  ctx.stroke();
  ctx.restore();
}

function drawVerifiedPill(ctx: CanvasRenderingContext2D, theme: FaceTheme) {
  const w = 190;
  const h = 52;
  const x = FACE_WIDTH - FRAME_INSET - 96 - w;
  const y = FRAME_INSET + 78;
  ctx.fillStyle = theme.accent;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = theme.accentForeground;
  ctx.font = `700 22px ${theme.body}`;
  ctx.textAlign = "center";
  ctx.fillText("VERIFIED", x + w / 2 + 2, y + 34);
}

// ── Text blocks ────────────────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, theme: FaceTheme, input: FaceInput) {
  ctx.fillStyle = theme.accentText;
  ctx.font = `300 40px ${theme.display}`;
  drawTracked(ctx, "GN ACADEMY", 190, 7);
  ctx.fillStyle = theme.muted;
  ctx.font = `500 21px ${theme.body}`;
  drawTracked(ctx, (input.level ?? "Professional certification").toUpperCase(), 238, 5);
}

function drawHolder(ctx: CanvasRenderingContext2D, theme: FaceTheme, input: FaceInput) {
  const label = `400 28px ${theme.body}`;
  drawCentered(ctx, "This certifies that", 388, label, theme.muted);
  const name = fitSingleLine(
    input.holderName.toUpperCase(),
    measureWith(ctx, 300, theme.display),
    88,
    CONTENT_WIDTH,
    32,
  );
  drawCentered(ctx, name.text, 496, `300 ${name.size}px ${theme.display}`, theme.ink);
  drawCentered(ctx, "has earned the credential", 582, label, theme.muted);
}

function drawTitle(ctx: CanvasRenderingContext2D, theme: FaceTheme, input: FaceInput) {
  const block = fitWrapped(
    input.title.toUpperCase(),
    measureWith(ctx, 300, theme.display),
    60,
    30,
    CONTENT_WIDTH,
    2,
  );
  block.lines.forEach((line, i) => {
    const y = 672 + i * block.size * 1.18;
    drawCentered(ctx, line, y, `300 ${block.size}px ${theme.display}`, theme.accentText);
  });
}

function drawFooterBlock(ctx: CanvasRenderingContext2D, theme: FaceTheme, input: FaceInput) {
  const issued = formatIssueDate(input.issuedAt);
  if (issued) {
    drawCentered(ctx, `Issued ${issued}`, 840, `400 28px ${theme.body}`, theme.muted);
  }
  const code = fitSingleLine(
    input.credentialCode,
    measureWith(ctx, 600, theme.mono),
    46,
    CONTENT_WIDTH,
    22,
  );
  ctx.font = `600 ${code.size}px ${theme.mono}`;
  ctx.fillStyle = theme.ink;
  drawTracked(ctx, code.text, 922, code.size * 0.1);
  const verify = fitSingleLine(
    `Verify at ${toVerifyLabel(input.verifyUrl)}`,
    measureWith(ctx, 400, theme.body),
    24,
    CONTENT_WIDTH,
    14,
  );
  drawCentered(ctx, verify.text, 984, `400 ${verify.size}px ${theme.body}`, theme.muted);
  drawCentered(
    ctx,
    "This certificate is only as valid as its verification page. Check the code.",
    1090,
    `400 20px ${theme.body}`,
    theme.muted,
  );
}

// ── Public builders ────────────────────────────────────────────────────────

function drawFront(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, theme: FaceTheme, input: FaceInput) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPaper(ctx, theme);
  drawFrame(ctx, theme);
  drawVerifiedPill(ctx, theme);
  drawHeader(ctx, theme, input);
  drawHolder(ctx, theme, input);
  drawTitle(ctx, theme, input);
  drawFooterBlock(ctx, theme, input);
}

function buildBack(theme: FaceTheme, pixelScale: number): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(FACE_WIDTH, FACE_HEIGHT, Math.min(pixelScale, 0.5));
  drawPaper(ctx, theme);
  drawFrame(ctx, theme);
  ctx.fillStyle = theme.accentText;
  ctx.globalAlpha = 0.5;
  ctx.font = `300 64px ${theme.display}`;
  drawTracked(ctx, "GN ACADEMY", FACE_HEIGHT / 2 + 20, 12);
  return canvas;
}

function buildShadow(theme: FaceTheme): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(256, 256, 1);
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, theme.ink);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 256, 256);
  return canvas;
}

/**
 * Builds the front, back and shadow canvases. `pixelScale` trades sharpness for
 * texture memory: 1 is about 8 MB of GPU memory for the front, 0.75 about 4.5.
 */
export async function buildCertificateCanvases(
  input: FaceInput,
  pixelScale = 1,
): Promise<FaceCanvases> {
  const theme = resolveFaceTheme();
  await waitForFonts(theme);
  const { canvas, ctx } = newCanvas(FACE_WIDTH, FACE_HEIGHT, pixelScale);
  drawFront(canvas, ctx, theme, input);
  return { front: canvas, back: buildBack(theme, pixelScale), shadow: buildShadow(theme) };
}
