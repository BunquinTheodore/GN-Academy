import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  CONTENT_WIDTH,
  TYPE_SIZES,
  embedCertificateFonts,
  fitFontSize,
  fitText,
  renderCertificatePdf,
  trackedWidth,
} from "@/lib/pdf/certificate";

/**
 * The route needs a database, so these test the drawing instead. What matters
 * is the thing that broke in production: the faces have to be embedded rather
 * than named, and a long Filipino name has to stay inside the gold rule.
 */

const credential = {
  holderName: "Maria Kristina Dela Cruz",
  title: "Certified AI Virtual Assistant",
  credentialCode: "CAVA-2026-000001",
  issuedAt: "2026-08-16T04:00:00.000Z",
  verifyLabel: "gnacademy.ph/verify/CAVA-2026-000001",
};

/** Exactly 60 and 70 characters, both longer than anything seeded. */
const LONG_NAME = "Mary Kristina Angelica Bernardo-Villanueva De Los Santos Jr.";
const LONG_TITLE =
  "Certified AI Virtual Assistant for Operations and Client Service Teams";

const NAME_FLOOR = 16;
const TITLE_FLOOR = 14;

/**
 * pdf-lib saves with object streams on, which Flate-compresses the font
 * dictionaries out of sight. Reloading and saving without them puts the
 * document's own structure back in plain bytes so it can be read.
 */
async function readableStructure(bytes: Uint8Array): Promise<string> {
  const reloaded = await PDFDocument.load(bytes);
  const flat = await reloaded.save({ useObjectStreams: false });
  return Buffer.from(flat).toString("latin1");
}

describe("certificate PDF", () => {
  it("produces a PDF that parses back as one A4 landscape page", async () => {
    const bytes = await renderCertificatePdf(credential);

    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");

    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
    const { width, height } = reloaded.getPage(0).getSize();
    expect(Math.round(width)).toBe(842);
    expect(Math.round(height)).toBe(595);
  });

  it("embeds the font programs rather than referencing base-14 names", async () => {
    const bytes = await renderCertificatePdf(credential);
    const structure = await readableStructure(bytes);

    // An embedded TrueType program lives in a FontFile2 stream. The old
    // StandardFonts version carried no font program at all, which is exactly
    // why a viewer without Helvetica substituted a serif.
    expect(structure).toContain("/FontFile2");
    expect(structure).toContain("/CIDFontType2");
    expect(structure).toContain("Bricolage");
    expect(structure).toContain("Inter");

    const empty = await (await PDFDocument.create()).save();
    expect(bytes.length).toBeGreaterThan(empty.length + 15_000);
  });

  it("keeps a 60-character name and a 70-character title inside the rule", async () => {
    expect(LONG_NAME).toHaveLength(60);
    expect(LONG_TITLE).toHaveLength(70);

    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);

    const nameSize = fitFontSize(
      LONG_NAME,
      fonts.display,
      TYPE_SIZES.name,
      CONTENT_WIDTH,
      NAME_FLOOR,
    );
    const titleSize = fitFontSize(
      LONG_TITLE,
      fonts.display,
      TYPE_SIZES.title,
      CONTENT_WIDTH,
      TITLE_FLOOR,
    );

    expect(
      fonts.display.widthOfTextAtSize(LONG_NAME, nameSize),
    ).toBeLessThanOrEqual(CONTENT_WIDTH);
    expect(
      fonts.display.widthOfTextAtSize(LONG_TITLE, titleSize),
    ).toBeLessThanOrEqual(CONTENT_WIDTH);

    // Shrinking is the point, so the sizes have to have actually come down,
    // and they have to have stopped well short of the floor. Hitting the
    // floor would mean the text is only fitting by luck.
    expect(nameSize).toBeLessThan(TYPE_SIZES.name);
    expect(titleSize).toBeLessThan(TYPE_SIZES.title);
    expect(nameSize).toBeGreaterThan(NAME_FLOOR);
    expect(titleSize).toBeGreaterThan(TITLE_FLOOR);

    // And the page they are drawn on still renders.
    const bytes = await renderCertificatePdf({
      ...credential,
      holderName: LONG_NAME,
      title: LONG_TITLE,
    });
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("leaves a name that already fits at its full size", async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);

    expect(
      fitFontSize(
        "Juan Cruz",
        fonts.display,
        TYPE_SIZES.name,
        CONTENT_WIDTH,
        NAME_FLOOR,
      ),
    ).toBe(TYPE_SIZES.name);
  });

  it("never returns a size below the floor, however long the text", async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);

    expect(
      fitFontSize(
        "x".repeat(400),
        fonts.display,
        TYPE_SIZES.name,
        CONTENT_WIDTH,
        NAME_FLOOR,
      ),
    ).toBe(NAME_FLOOR);
  });

  it("counts letter spacing when measuring the credential code", async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);

    const plain = fonts.bodySemi.widthOfTextAtSize(
      credential.credentialCode,
      TYPE_SIZES.code,
    );
    const tracked = trackedWidth(
      credential.credentialCode,
      fonts.bodySemi,
      TYPE_SIZES.code,
      TYPE_SIZES.code * 0.1,
    );

    expect(tracked).toBeGreaterThan(plain);
    // A tracked code still has to fit between the rules.
    expect(tracked).toBeLessThanOrEqual(CONTENT_WIDTH);
  });

  /**
   * profiles.full_name accepts 120 characters. At the 16pt floor that measures
   * far wider than the 842pt page, and the old code returned the floor anyway,
   * so centerText computed a negative x and drew the name off both edges of the
   * paper. Found by a code review, not by this file, which only ever tried 60
   * and 70 characters.
   */
  it("cuts a name that cannot fit even at the floor, rather than overflowing", async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);
    const NAME_FLOOR = 16;
    const absurd = "Maria Kristina Angelica Dela Cruz-Villanueva Buenaventura Magsaysay Rodriguez".repeat(2);

    expect(absurd.length).toBeGreaterThan(120);
    // The unfixed behaviour, kept as the thing being guarded against.
    const floorSize = fitFontSize(absurd, fonts.display, TYPE_SIZES.name, CONTENT_WIDTH, NAME_FLOOR);
    expect(fonts.display.widthOfTextAtSize(absurd, floorSize)).toBeGreaterThan(CONTENT_WIDTH);

    const fitted = fitText(absurd, fonts.display, TYPE_SIZES.name, CONTENT_WIDTH, NAME_FLOOR);
    expect(fitted.size).toBe(NAME_FLOOR);
    expect(fitted.text.endsWith("...")).toBe(true);
    expect(
      fonts.display.widthOfTextAtSize(fitted.text, fitted.size),
    ).toBeLessThanOrEqual(CONTENT_WIDTH);
  });

  it("leaves a name that fits completely alone", async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedCertificateFonts(doc);
    const fitted = fitText(
      credential.holderName,
      fonts.display,
      TYPE_SIZES.name,
      CONTENT_WIDTH,
      16,
    );
    expect(fitted.text).toBe(credential.holderName);
    expect(fitted.size).toBe(TYPE_SIZES.name);
  });
});
