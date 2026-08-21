import { env } from "@/lib/env";

export const AVATAR_BUCKET = "avatars";
export const PORTFOLIO_BUCKET = "portfolio";

/**
 * Public URL for an object. Both buckets are public-read by design — the
 * whole point of a portfolio is that an employer can look at it without an
 * account — so this is plain string building, not a signed-URL round trip.
 */
export function publicStorageUrl(bucket: string, path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

/**
 * Uploads land in a folder named after the uploader's Firebase UID; the
 * storage policies in migration 0005 accept writes nowhere else, so a path
 * built here is also the path the database will allow.
 */
export function ownedObjectPath(
  userId: string,
  filename: string,
): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${userId}/${safe}`;
}
