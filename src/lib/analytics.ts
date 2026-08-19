/**
 * §13 funnel events. This file is the only analytics boundary — nothing
 * else may reference a vendor SDK or global (§4).
 *
 * The provider is loaded as a plain script tag driven by two public env
 * vars, not as an npm dependency, so switching vendors is a config change
 * and there is no vendor code in the bundle when analytics is off. Any
 * cookieless provider exposing a `track(name, props)` global works —
 * Umami, Plausible, and Counter.dev all follow that shape.
 *
 * Cookieless is a requirement, not a preference: no cookie means no
 * consent banner, and no consent banner means nothing stands between a
 * first-time visitor and the free test (§13, §14).
 */

export type AnalyticsEvent =
  | "test_started"
  | "test_question_answered"
  | "test_completed"
  | "email_captured"
  | "free_course_started"
  | "free_lesson_completed"
  | "free_exam_passed"
  | "certification_viewed"
  | "enrollment_started"
  | "enrollment_confirmed"
  | "credential_issued"
  | "credential_verified";

export type AnalyticsProps = Record<string, string | number | boolean>;

/** Set together, or analytics stays off. See .env.example. */
export const ANALYTICS_SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "";
export const ANALYTICS_WEBSITE_ID =
  process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID ?? "";

export const analyticsEnabled = Boolean(ANALYTICS_SRC && ANALYTICS_WEBSITE_ID);

/** The provider's origin, for the CSP allowlist. Empty when disabled. */
export function analyticsOrigin(): string {
  if (!ANALYTICS_SRC) return "";
  try {
    return new URL(ANALYTICS_SRC).origin;
  } catch {
    // A relative src (self-hosted proxy) needs no extra CSP entry.
    return "";
  }
}

type TrackGlobal = { track?: (name: string, props?: AnalyticsProps) => void };

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;

  const provider = (window as unknown as { umami?: TrackGlobal }).umami;
  if (provider?.track) {
    try {
      provider.track(event, props);
    } catch {
      // Analytics must never break a page. Swallow and move on.
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, props ?? {});
  }
}
