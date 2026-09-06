import { z } from "zod";
import { createSessionCookie, getSessionUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { isTrustedOrigin, untrustedOriginResponse } from "@/lib/origin-check";

const bodySchema = z.object({ idToken: z.string().min(1) });

/**
 * Slides a signed-in session forward.
 *
 * The session cookie was minted once at sign-in with a fixed five day life and
 * nothing ever renewed it, so somebody working through a course was signed out
 * mid-lesson on day six however active they had been. `onIdTokenChanged` was
 * exported from the Firebase client and used nowhere, which is the hook this
 * needed.
 *
 * Separate from POST /api/auth/session on purpose. That route is how you sign
 * in, and it is rate limited tightly; a background refresh sharing its budget
 * would lock real people out of logging in from the same carrier NAT address.
 *
 * This refuses when there is no live session already. Renewing is for someone
 * who is signed in: a caller holding only an ID token should go through the
 * sign-in route, which is where that exchange belongs.
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return untrustedOriginResponse();
  if (!(await checkRateLimit(request, RATE_LIMITS.sessionRefresh))) {
    return rateLimitedResponse();
  }

  const existing = await getSessionUser();
  if (!existing) {
    return Response.json({ error: "No session to refresh." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    // The token has to belong to the session it is renewing. Without this a
    // refresh could quietly swap the cookie to a different account, and the
    // learner would carry on with somebody else's dashboard in front of them.
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken, true);
    if (decoded.uid !== existing.uid) {
      return Response.json(
        { error: "That token is for a different account." },
        { status: 403 },
      );
    }
    await createSessionCookie(parsed.data.idToken);
    return Response.json({ ok: true });
  } catch {
    // The cookie that is already set stays valid, so there is nothing for the
    // caller to do about this and nothing to show the learner.
    return Response.json({ error: "Could not refresh." }, { status: 401 });
  }
}
