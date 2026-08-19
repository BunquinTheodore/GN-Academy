"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCertificationForLesson,
  getModulesWithLessonMeta,
} from "@/lib/db/certifications";
import { getEnrollment, updateEnrollmentProgress } from "@/lib/db/enrollments";
import { getCompletedLessonIds, markLessonComplete } from "@/lib/db/progress";

const schema = z.object({ lessonId: z.string().uuid() });

/**
 * Marks a lesson complete and returns where the learner goes next, instead
 * of redirecting itself.
 *
 * The obvious shape here is `redirect()` at the end of the action, and that
 * is what this used to do — but chained action redirects are unreliable in
 * the App Router: once the router has performed one, the next redirect
 * returned by an action on the arrived page is silently dropped. The learner
 * clicks "Mark complete and continue", the row is written, the response
 * carries the redirect, and the page just sits there until they click again.
 * Reproducible against a production build; `next dev` hides it.
 *
 * Returning the href and letting the caller navigate makes every step of the
 * course identical to the first one.
 */
export type CompleteLessonResult = { nextHref: string };

export async function completeLessonAction(
  lessonId: string,
): Promise<CompleteLessonResult> {
  const COURSES = "/dashboard/courses";

  const parsed = schema.safeParse({ lessonId });
  if (!parsed.success) return { nextHref: COURSES };

  // Every hop here is a round trip to the database region, and this runs on
  // the click a learner makes most often, so independent ones go together.
  const [user, context] = await Promise.all([
    getSessionUser(),
    getCertificationForLesson(parsed.data.lessonId).catch(() => null),
  ]);
  if (!user) return { nextHref: "/login?next=/dashboard/courses" };
  if (!context) return { nextHref: COURSES };

  const [enrollment, modules] = await Promise.all([
    getEnrollment(user.uid, context.certification.id).catch(() => null),
    getModulesWithLessonMeta(context.certification.id),
  ]);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    return { nextHref: COURSES };
  }

  const allLessons = modules.flatMap((m) => m.lessons);

  // The completion write has to land before the progress read, or the lesson
  // just finished would be missing from the count.
  await markLessonComplete(user.uid, parsed.data.lessonId);
  const done = await getCompletedLessonIds(
    user.uid,
    allLessons.map((l) => l.id),
  );
  const percent =
    allLessons.length === 0
      ? 0
      : Math.round((done.size / allLessons.length) * 100);
  const index = allLessons.findIndex((l) => l.id === parsed.data.lessonId);
  const next = allLessons.slice(index + 1).find((l) => !done.has(l.id));

  // Nothing below depends on the percent write, but the learner should not
  // reach the next page before it lands, or a refresh would show stale
  // progress. It is the last hop, not a hidden one.
  await updateEnrollmentProgress(user.uid, context.certification.id, percent);

  return { nextHref: next ? `/dashboard/learn/${next.id}` : COURSES };
}
