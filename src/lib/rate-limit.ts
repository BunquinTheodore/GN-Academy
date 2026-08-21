import "server-only";

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env.server";

/** Never store or log raw IPs — hash with the server-side salt (§14). */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${serverEnv.IP_HASH_SALT}:${ip}`)
    .digest("hex");
}

export function clientIpFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitRule = {
  route: string;
  max: number;
  windowSeconds: number;
};

export const RATE_LIMITS = {
  attemptCreate: { route: "attempt-create", max: 5, windowSeconds: 3600 },
  emailCapture: { route: "email-capture", max: 3, windowSeconds: 3600 },
  auth: { route: "auth", max: 10, windowSeconds: 900 },
  // Its own bucket, not emailCapture's: someone exercising a legal right
  // must never be blocked because a housemate on the same connection took
  // the free test three times (§14).
  dataRequest: { route: "data-request", max: 5, windowSeconds: 3600 },
  // A recruiter contacting several candidates in one sitting is normal
  // behaviour, so this is looser than the other write buckets.
  enquiry: { route: "enquiry", max: 10, windowSeconds: 3600 },
  verifyLookup: { route: "verify-lookup", max: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Postgres-backed limiter (no free WAF, §12). Fails open on database errors:
 * losing rate limiting briefly is better than taking the whole funnel down
 * with the database.
 */
export async function checkRateLimit(
  request: Request,
  rule: RateLimitRule,
): Promise<boolean> {
  const key = `${hashIp(clientIpFrom(request))}:${rule.route}`;
  try {
    const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
      p_key: key,
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("rate limit check failed", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("rate limit check failed", e);
    return true;
  }
}

export function rateLimitedResponse(): Response {
  return Response.json(
    { error: "Too many requests. Try again in a little while." },
    { status: 429 },
  );
}
