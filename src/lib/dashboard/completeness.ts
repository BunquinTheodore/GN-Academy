import type { Profile } from "@/lib/db/profiles";

/**
 * How finished a learner's public profile is, as a percentage.
 *
 * Only fields an employer actually reads count. Location is excluded because
 * it defaults to "Philippines" for everyone — counting it would show 20% to
 * someone who has filled in nothing, which is worse than useless as a prompt
 * to go and fill something in.
 */
const FIELDS: ((p: Profile) => boolean)[] = [
  (p) => Boolean(p.full_name?.trim()),
  (p) => Boolean(p.username?.trim()),
  (p) => Boolean(p.headline?.trim()),
  (p) => Boolean(p.bio?.trim()),
  (p) => (p.skills?.length ?? 0) > 0,
  (p) => Boolean(p.avatar_url?.trim()),
];

export function profileCompleteness(profile: Profile | null): number {
  if (!profile) return 0;
  const done = FIELDS.filter((has) => has(profile)).length;
  return Math.round((done / FIELDS.length) * 100);
}
