/**
 * §13 funnel events. Named and typed now so every call site exists; the
 * provider gets wired in phase 4 (cookieless, to avoid a consent banner).
 * Keep this file the only analytics boundary — nothing else may import a
 * vendor SDK (§4: no @vercel/* outside lib/analytics).
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

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  // TODO(phase-4): wire a cookieless provider here.
  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, props ?? {});
  }
}
