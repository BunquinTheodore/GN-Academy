import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time check of a presented shared secret. Both sides are hashed
 * first so the comparison is always between two 32 byte buffers: a plain
 * timingSafeEqual throws on unequal lengths, and a length check before it
 * would leak the secret length.
 */
export function secretMatches(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!presented || !expected) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Pulls the secret out of an `Authorization: Bearer <secret>` header. */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match ? match[1] : null;
}
