/**
 * Turns what someone typed or pasted into a credential code, the same way the
 * `/verify` lookup form does: uppercase, with every run of whitespace removed
 * (a code copied from a CV often arrives with stray spaces or a line break).
 *
 * Returns null when nothing is left, so a caller can ask for a code instead of
 * sending a visitor to a "not found" page for an empty string.
 */
export function normalizeCredentialCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/\s+/g, "");
  return code === "" ? null : code;
}

/** The public verification page for a code. */
export function verifyPathForCode(code: string): string {
  return `/verify/${encodeURIComponent(code)}`;
}
