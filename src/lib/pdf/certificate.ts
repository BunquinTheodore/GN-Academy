import { readFileSync } from "node:fs";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";

import { formatDate } from "@/lib/format";

/**
 * The certificate page, drawn with real embedded type.
 *
 * This used to use StandardFonts.Helvetica, which is a *reference* to one of
 * the base-14 fonts rather than an embedded face. A viewer that has no
 * Helvetica substitutes whatever it likes, which on a lot of desktops is a
 * serif — the client saw the certificate and said it "looks like Times New
 * Roman", and they were reading it correctly. The only fix is to embed the
 * bytes, which needs fontkit registered on the document.
 *
 * The four TTFs in ./fonts are STATIC instances on purpose. The Google Fonts
 * downloads are variable fonts, and pdf-lib embeds a variable font at its
 * default instance: every "bold" would have come out at weight 400 with no
 * warning anywhere.
 *
 * Drawing lives here rather than in the route handler so it can be tested
 * without a database. The route reads the credential; this takes the shape it
 * produced and returns bytes.
 */

// ── Page geometry ──────────────────────────────────────────────────────────

/** A4 landscape, in points. */
export const PAGE_WIDTH = 842;
export const PAGE_HEIGHT = 595;

/** The gold rule, inset from the trim. */
const FRAME_INSET = 24;

/**
 * Clear space between the gold rule and the widest line of type. Embedded
 * faces measure noticeably wider than the base-14 metrics did, so this is the
 * budget the auto-shrink below spends.
 */
const FRAME_PADDING = 48;

/** Every centred line has to fit inside this. */
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * (FRAME_INSET + FRAME_PADDING);

// ── Palette (unchanged: the client said the design looks good) ─────────────

const INK = rgb(0x10 / 255, 0x1b / 255, 0x2e / 255);
const PAPER = rgb(0xf5 / 255, 0xf7 / 255, 0xfa / 255);
const GOLD = rgb(0xc0 / 255, 0x8a / 255, 0x2e / 255);
const SLATE = rgb(0x8f / 255, 0xa3 / 255, 0xbf / 255);

/**
 * Starting sizes. The old ones were set against Helvetica's metrics and read
 * small on paper; these are the sizes the client asked for. `name` and
 * `title` are starting points only — `fitFontSize` takes them down when the
 * text is long.
 */
export const TYPE_SIZES = {
  wordmark: 20,
  eyebrow: 10.5,
  label: 13,
  name: 42,
  title: 28,
  code: 22,
  verify: 11,
  footer: 9.5,
} as const;

/**
 * Floors for the two lines that shrink. A 60-character name set at 16pt is
 * still perfectly legible; the same name running off the page is not.
 */
const MIN_NAME_SIZE = 16;
const MIN_TITLE_SIZE = 14;

/** Tracking on the credential code, as a fraction of its size. */
const CODE_TRACKING = 0.1;

// ── Font bytes, read once ──────────────────────────────────────────────────

const FONT_DIR = join(process.cwd(), "src", "lib", "pdf", "fonts");

/**
 * Read at module scope so a warm lambda pays for the disk once rather than on
 * every download. Embedding is per-document and stays in the render below.
 *
 * Keep the path a literal join off process.cwd(), and keep the matching
 * `outputFileTracingIncludes` entry in next.config.ts. Files under src/ that
 * are only ever opened with fs reach a Vercel lambda solely because the tracer
 * was told to copy them; miss that and the route throws ENOENT in production
 * while working perfectly on a local build, where the whole repo is on disk.
 */
const FONT_BYTES = {
  display: readFileSync(join(FONT_DIR, "BricolageGrotesque-Bold.ttf")),
  displaySemi: readFileSync(join(FONT_DIR, "BricolageGrotesque-SemiBold.ttf")),
  body: readFileSync(join(FONT_DIR, "Inter-Regular.ttf")),
  bodySemi: readFileSync(join(FONT_DIR, "Inter-SemiBold.ttf")),
} as const;

export type CertificateFonts = {
  /** Bricolage Grotesque Bold, the site's display face (globals.css). */
  display: PDFFont;
  displaySemi: PDFFont;
  /** Inter, for labels, dates and the footer. */
  body: PDFFont;
  bodySemi: PDFFont;
};

/**
 * Embeds the four faces into a document. Exported so a test can measure with
 * exactly the fonts the certificate is drawn with.
 *
 * Subsetting keeps the file around 30 kB instead of a megabyte of font tables
 * for one page of text.
 */
export async function embedCertificateFonts(
  doc: PDFDocument,
): Promise<CertificateFonts> {
  doc.registerFontkit(fontkit);
  const [display, displaySemi, body, bodySemi] = await Promise.all([
    doc.embedFont(FONT_BYTES.display, { subset: true }),
    doc.embedFont(FONT_BYTES.displaySemi, { subset: true }),
    doc.embedFont(FONT_BYTES.body, { subset: true }),
    doc.embedFont(FONT_BYTES.bodySemi, { subset: true }),
  ]);
  return { display, displaySemi, body, bodySemi };
}

// ── Measuring ──────────────────────────────────────────────────────────────

/**
 * The largest size at or below `startSize` at which `text` fits `maxWidth`,
 * never going below `minSize`.
 *
 * Filipino full names are long, and "Ma. Kristina Angelica Dela Cruz-Villanueva"
 * is not an unusual thing to have to print. Half-point steps because a whole
 * point of difference is visible when two certificates sit side by side.
 */
export function fitFontSize(
  text: string,
  font: PDFFont,
  startSize: number,
  maxWidth: number,
  minSize: number,
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return Math.max(size, minSize);
}

/**
 * Shrinks `text` to fit, and if it still does not fit at `minSize`, cuts it
 * down until it does.
 *
 * `fitFontSize` alone is not enough, because it stops at the floor and returns
 * it whether or not the text fits there. `profiles.full_name` accepts 120
 * characters, and 120 characters of Bricolage Bold at the 16pt floor measure
 * about 1340pt on an 842pt page: `centerText` would compute a negative x and
 * draw the name off both edges of the paper.
 *
 * Cutting somebody's name is bad. Printing it off the edge of their
 * certificate is worse, and it is the one thing on this page they will look at
 * first.
 */
export function fitText(
  text: string,
  font: PDFFont,
  startSize: number,
  maxWidth: number,
  minSize: number,
): { text: string; size: number } {
  const size = fitFontSize(text, font, startSize, maxWidth, minSize);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };

  const ellipsis = "...";
  let cut = text.length;
  while (
    cut > 1 &&
    font.widthOfTextAtSize(text.slice(0, cut) + ellipsis, size) > maxWidth
  ) {
    cut -= 1;
  }
  return { text: text.slice(0, cut).trimEnd() + ellipsis, size };
}

/** Width of a tracked run, since pdf-lib measures without letter spacing. */
export function trackedWidth(
  text: string,
  font: PDFFont,
  size: number,
  tracking: number,
): number {
  if (!text) return 0;
  return font.widthOfTextAtSize(text, size) + tracking * (text.length - 1);
}

// ── Rendering ──────────────────────────────────────────────────────────────

/** The shape of a credential row this needs, and nothing more. */
export type CertificateInput = {
  holderName: string;
  title: string;
  credentialCode: string;
  issuedAt: Date | string;
  /** Host and path only, e.g. `gnacademy.ph/verify/CAVA-2026-000001`. */
  verifyLabel: string;
};

export async function renderCertificatePdf(
  input: CertificateInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts = await embedCertificateFonts(doc);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: INK,
  });
  page.drawRectangle({
    x: FRAME_INSET,
    y: FRAME_INSET,
    width: PAGE_WIDTH - 2 * FRAME_INSET,
    height: PAGE_HEIGHT - 2 * FRAME_INSET,
    borderColor: GOLD,
    borderWidth: 1.5,
  });

  const centerText = (
    text: string,
    y: number,
    size: number,
    font: PDFFont,
    color = PAPER,
  ) => {
    const x = (PAGE_WIDTH - font.widthOfTextAtSize(text, size)) / 2;
    page.drawText(text, { x, y, size, font, color });
  };

  /**
   * Draws a centred run one glyph at a time so it can be letter-spaced. The
   * credential code needs to read as a code without a monospace face in the
   * document, and tracking is what does that.
   */
  const centerTracked = (
    text: string,
    y: number,
    size: number,
    font: PDFFont,
    color = PAPER,
  ) => {
    const tracking = size * CODE_TRACKING;
    let x = (PAGE_WIDTH - trackedWidth(text, font, size, tracking)) / 2;
    for (const char of text) {
      page.drawText(char, { x, y, size, font, color });
      x += font.widthOfTextAtSize(char, size) + tracking;
    }
  };

  const top = PAGE_HEIGHT;

  centerText("GN ACADEMY", top - 92, TYPE_SIZES.wordmark, fonts.display, GOLD);
  centerText(
    "PROFESSIONAL CREDENTIAL",
    top - 116,
    TYPE_SIZES.eyebrow,
    fonts.body,
    SLATE,
  );

  centerText(
    "This certifies that",
    top - 194,
    TYPE_SIZES.label,
    fonts.body,
    SLATE,
  );
  const name = fitText(
    input.holderName,
    fonts.display,
    TYPE_SIZES.name,
    CONTENT_WIDTH,
    MIN_NAME_SIZE,
  );
  centerText(name.text, top - 248, name.size, fonts.display, PAPER);

  centerText(
    "has earned the credential",
    top - 294,
    TYPE_SIZES.label,
    fonts.body,
    SLATE,
  );
  const title = fitText(
    input.title,
    fonts.display,
    TYPE_SIZES.title,
    CONTENT_WIDTH,
    MIN_TITLE_SIZE,
  );
  centerText(title.text, top - 340, title.size, fonts.display, GOLD);

  centerText(
    `Issued ${formatDate(input.issuedAt)}`,
    top - 400,
    TYPE_SIZES.label,
    fonts.body,
    SLATE,
  );
  centerTracked(
    input.credentialCode,
    top - 442,
    TYPE_SIZES.code,
    fonts.bodySemi,
    PAPER,
  );
  centerText(
    `Verify at ${input.verifyLabel}`,
    top - 470,
    TYPE_SIZES.verify,
    fonts.body,
    SLATE,
  );

  centerText(
    "This certificate is only as valid as its verification page. Check the code.",
    58,
    TYPE_SIZES.footer,
    fonts.body,
    SLATE,
  );

  return doc.save();
}
