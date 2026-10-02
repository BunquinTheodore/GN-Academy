/**
 * Splits text into sentences at whitespace that follows a full stop.
 *
 * Small on purpose: it exists so a heading kept as one editable string in
 * `landing.ts` can be set as two lines. It does not try to handle
 * abbreviations; a full stop followed by a space ends a sentence.
 */
export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}
