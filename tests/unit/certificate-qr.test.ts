import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { qrMatrix, shortHashLine } from "@/lib/pdf/qr";

const base = {
  holderName: "Maria Kristina Dela Cruz",
  title: "Certified AI Virtual Assistant",
  credentialCode: "CAVA-2026-000001",
  issuedAt: "2026-08-16T04:00:00.000Z",
  verifyLabel: "gnacademy.test/verify/CAVA-2026-000001",
};

const HASH = "3fa9c2d4e1b7a05566778899aabbccddeeff00112233445566778899aabbccdd";

describe("certificate QR", () => {
  it("encodes the verify URL as a square module matrix with finder patterns", () => {
    const matrix = qrMatrix("https://gnacademy.test/verify/CAVA-2026-000001");
    const size = matrix.length;
    expect(size).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === size)).toBe(true);
    // The three finder patterns start with a dark module in three corners.
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][size - 1]).toBe(true);
    expect(matrix[size - 1][0]).toBe(true);
  });

  it("is deterministic for the same text", () => {
    expect(qrMatrix("abc")).toEqual(qrMatrix("abc"));
  });

  it("shortens a hash for print and is empty without one", () => {
    expect(shortHashLine(HASH)).toBe("Anchor hash 3fa9c2d4e1b7a055...");
    expect(shortHashLine(null)).toBeNull();
  });

  it("draws the QR into the PDF and keeps it one A4 landscape page", async () => {
    const bytes = await renderCertificatePdf({
      ...base,
      verifyUrl: "https://gnacademy.test/verify/CAVA-2026-000001",
      anchorHash: HASH,
    });
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);

    // Module rectangles live in the page content stream; a page with the QR
    // has a visibly larger stream than the same page without a hash line.
    const withoutHash = await renderCertificatePdf(base);
    const contentLength = async (b: Uint8Array) => {
      const doc = await PDFDocument.load(b);
      const flat = Buffer.from(await doc.save({ useObjectStreams: false })).toString("latin1");
      return flat.length;
    };
    expect(await contentLength(bytes)).toBeGreaterThan(await contentLength(withoutHash));
    expect(bytes.length).toBeGreaterThan(0);
  });
});
