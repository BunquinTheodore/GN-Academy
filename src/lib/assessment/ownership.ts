import "server-only";

import { getAnonId } from "@/lib/auth/anon";
import { getSessionUser } from "@/lib/auth/session";
import type { Attempt } from "@/lib/db/attempts";

/**
 * An attempt may be written to by the browser that created it (anon cookie)
 * or the signed-in user it belongs to. Everything else is a 403.
 */
export async function canWriteAttempt(attempt: Attempt): Promise<boolean> {
  const anonId = await getAnonId();
  if (attempt.anon_id && anonId && attempt.anon_id === anonId) return true;
  const user = await getSessionUser();
  if (attempt.user_id && user && attempt.user_id === user.uid) return true;
  return false;
}
