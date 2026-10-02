import QRCode from "qrcode";

/**
 * Pure helpers for the certificate QR. `qrcode` is pure JS and its `create`
 * call is synchronous, so the code is returned as a plain boolean matrix and
 * drawn as vector rectangles by certificate.ts: no PNG, no canvas, no native
 * dependency in the serverless function.
 */

/** Rows of modules, true where the module is dark. */
export function qrMatrix(text: string): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = modules.size;
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => modules.get(row, col) === 1),
  );
}

const SHORT_HASH_LENGTH = 16;

/** The line printed under the verify URL, or null when the credential has no hash. */
export function shortHashLine(anchorHash: string | null | undefined): string | null {
  if (!anchorHash) return null;
  return `Anchor hash ${anchorHash.slice(0, SHORT_HASH_LENGTH)}...`;
}
