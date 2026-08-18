import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import {
  getProfileById,
  markClaimsSynced,
  upsertProfileOnSync,
} from "@/lib/db/profiles";
import { linkAttemptsToUser } from "@/lib/db/attempts";
import { getAnonId } from "@/lib/auth/anon";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({
  idToken: z.string().min(1),
  marketingConsent: z.boolean().optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
});

/**
 * §6.2 free-tier workaround for Firebase blocking functions.
 * Verifies the ID token, sets the custom claim `role: "authenticated"` that
 * Supabase RLS requires, and upserts the profile row. The client must call
 * `getIdToken(true)` afterwards to pick up the claim.
 */
export async function POST(request: Request) {
  if (!(await checkRateLimit(request, RATE_LIMITS.auth))) {
    return rateLimitedResponse();
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(parsed.data.idToken);
  } catch {
    return Response.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const uid = decoded.uid;

  try {
    await upsertProfileOnSync({
      id: uid,
      email: decoded.email ?? "",
      full_name:
        parsed.data.fullName ??
        (typeof decoded.name === "string" ? decoded.name : null),
      avatar_url: typeof decoded.picture === "string" ? decoded.picture : null,
      marketing_consent: parsed.data.marketingConsent,
    });

    const profile = await getProfileById(uid);
    const alreadySynced = profile?.claims_synced === true && decoded.role === "authenticated";

    if (!alreadySynced) {
      const existing = (await adminAuth().getUser(uid)).customClaims ?? {};
      await adminAuth().setCustomUserClaims(uid, {
        ...existing,
        role: "authenticated",
      });
      await markClaimsSynced(uid);
    }

    // §8: claim any anonymous test attempts made from this browser.
    const anonId = await getAnonId();
    if (anonId) {
      await linkAttemptsToUser(anonId, uid).catch((e) =>
        console.error("attempt linking failed", e),
      );
    }

    return Response.json({ synced: true, refreshed: !alreadySynced });
  } catch (e) {
    console.error("auth sync failed", e);
    return Response.json(
      { error: "Could not sync your account. Try again." },
      { status: 500 },
    );
  }
}
