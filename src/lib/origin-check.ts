import "server-only";
import { env } from "@/lib/env";

/**
 * Defense-in-depth against CSRF on the hand-written route handlers under
 * `src/app/api/**`. Server Actions get same-origin verification from Next
 * itself; these plain `route.ts` files don't, and today rely implicitly on
 * `sameSite: "lax"` cookies (§6) to keep a cross-site POST from carrying
 * credentials. That's a real mitigation, but it shouldn't be the only one on
 * a hand-rolled endpoint.
 *
 * Browsers send `Origin` on every same-site POST/PATCH/DELETE fetch, so a
 * mismatched value is a strong signal of a cross-site request. A missing
 * Origin is not treated as suspicious on its own — some legitimate same-site
 * requests omit it — so this only rejects a request that actively claims to
 * be from somewhere else.
 */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(env.NEXT_PUBLIC_SITE_URL).origin;
}

export function untrustedOriginResponse(): Response {
  return Response.json({ error: "Request rejected." }, { status: 403 });
}
