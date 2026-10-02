/**
 * Pure layout math for the certificate face: text fitting, wrapping and
 * formatting. No DOM, no canvas, so it can be unit tested in plain Node.
 *
 * The idea is borrowed from `fitText` in src/lib/pdf/certificate.ts, but this is
 * a separate implementation that takes a `measure` callback instead of a
 * pdf-lib font, so the canvas drawer can pass `ctx.measureText`.
 */

/** Width in px of `text` when drawn at `size` px in the face's current font. */
export type Measure = (text: string, size: number) => number;

/** ASCII on purpose: house rule keeps odd punctuation out of the copy. */
export const ELLIPSIS = "...";

const SHRINK_STEP = 1;

export type FittedLine = { text: string; size: number };
export type FittedBlock = { lines: readonly string[]; size: number };

/** Cuts `text` until it plus an ellipsis fits `maxWidth` at `size`. */
function ellipsize(
  text: string,
  measure: Measure,
  size: number,
  maxWidth: number,
): string {
  const chars = Array.from(text);
  let cut = chars.length;
  while (
    cut > 1 &&
    measure(chars.slice(0, cut).join("") + ELLIPSIS, size) > maxWidth
  ) {
    cut -= 1;
  }
  return chars.slice(0, cut).join("").trimEnd() + ELLIPSIS;
}

/**
 * Largest size at or below `startSize` (never below `minSize`) that fits
 * `maxWidth`. If even the floor does not fit, the text is cut with an
 * ellipsis so a 120 character name never runs off the paper.
 */
export function fitSingleLine(
  text: string,
  measure: Measure,
  startSize: number,
  maxWidth: number,
  minSize: number,
): FittedLine {
  const floor = Math.min(minSize, startSize);
  let size = startSize;
  while (size > floor && measure(text, size) > maxWidth) {
    size -= SHRINK_STEP;
  }
  size = Math.max(size, floor);
  if (measure(text, size) <= maxWidth) return { text, size };
  return { text: ellipsize(text, measure, size, maxWidth), size };
}

/** Splits one over-long word into chunks that each fit `maxWidth`. */
function breakWord(
  word: string,
  measure: Measure,
  size: number,
  maxWidth: number,
): { full: readonly string[]; rest: string } {
  const full: string[] = [];
  let chunk = "";
  for (const char of Array.from(word)) {
    if (chunk && measure(chunk + char, size) > maxWidth) {
      full.push(chunk);
      chunk = char;
    } else {
      chunk += char;
    }
  }
  return { full, rest: chunk };
}

function greedyLines(
  words: readonly string[],
  measure: Measure,
  size: number,
  maxWidth: number,
): readonly string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (measure(word, size) <= maxWidth) {
      current = word;
    } else {
      const { full, rest } = breakWord(word, measure, size, maxWidth);
      lines.push(...full);
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Greedy word wrap at a fixed size, ellipsizing the last line past `maxLines`. */
export function wrapLines(
  text: string,
  measure: Measure,
  size: number,
  maxWidth: number,
  maxLines: number,
): { lines: readonly string[]; truncated: boolean } {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = greedyLines(words, measure, size, maxWidth);
  if (lines.length <= maxLines) return { lines, truncated: false };

  const kept = lines.slice(0, maxLines - 1);
  const tail = lines.slice(maxLines - 1).join(" ");
  return {
    lines: [...kept, ellipsize(tail, measure, size, maxWidth)],
    truncated: true,
  };
}

/** Shrinks a wrapped block until it fits in `maxLines`, truncating at the floor. */
export function fitWrapped(
  text: string,
  measure: Measure,
  startSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number,
): FittedBlock {
  const floor = Math.min(minSize, startSize);
  for (let size = startSize; size > floor; size -= SHRINK_STEP) {
    const attempt = wrapLines(text, measure, size, maxWidth, maxLines);
    if (!attempt.truncated) return { lines: attempt.lines, size };
  }
  const last = wrapLines(text, measure, floor, maxWidth, maxLines);
  return { lines: last.lines, size: floor };
}

/** Same format as CredentialCard and the PDF: "5 March 2026", Manila time. */
export function formatIssueDate(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

/** `https://host/verify/CODE/` becomes `host/verify/CODE` for printing. */
export function toVerifyLabel(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/+$/, "");
}
