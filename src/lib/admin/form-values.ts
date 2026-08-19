/**
 * FormData coercion shared by every admin action. Plain functions with no
 * React imports so server actions can use them without pulling the admin
 * field components (and their client dependencies) into the server bundle.
 */

/** Empty strings become null — HTML forms have no way to say "unset". */
export function optional(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

export function optionalInt(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Arrays are edited as one-per-line text — no JSON in the admin UI. */
export function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
