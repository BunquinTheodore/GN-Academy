import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCertificationForLesson,
  getModulesWithLessonMeta,
} from "@/lib/db/certifications";
import { getEnrollment, updateEnrollmentProgress } from "@/lib/db/enrollments";
import { getCompletedLessonIds, markLessonComplete } from "@/lib/db/progress";

const paramsSchema = z.object({ lessonId: z.string().uuid() });

const COURSES = "/dashboard/courses";

/**
 * Marks a lesson complete and answers with where the learner goes next.
 *
 * This is a route handler and not a server action, which is unusual in this
 * codebase and deliberate. It was an action, and the action was the single
 * most reliable way to break the course: the work finished on the server in
 * well under a second while the browser sat on a disabled "Saving…" button
 * until the test budget ran out. Measured three separate ways — the action's
 * own `revalidatePath` calls, then a `router.refresh()` behind it, then
 * neither — and the hang survived under any concurrency at all while passing
 * every time the journey ran alone. A route handler returns JSON: no
 * transition to commit, no re-render riding on the response, nothing to
 * stall. `next dev` hides every version of this.
 *
 * The client navigates with the href this returns. Redirecting from the
 * server does not work either — the App Router drops the second redirect in a
 * chain, which is what made lesson two onward need a second click.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
): Promise<Response> {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return Response.json({ nextHref: COURSES });

  const { lessonId } = params.data;

  try {
    // Every hop here is a round trip to the database region, and this runs on
    // the click a learner makes most often, so independent ones go together.
    const [user, certContext] = await Promise.all([
      getSessionUser(),
      getCertificationForLesson(lessonId).catch(() => null),
    ]);
    if (!user) {
      return Response.json(
        { nextHref: "/login?next=/dashboard/courses" },
        { status: 401 },
      );
    }
    if (!certContext) return Response.json({ nextHref: COURSES });

    const [enrollment, modules] = await Promise.all([
      getEnrollment(user.uid, certContext.certification.id).catch(() => null),
      getModulesWithLessonMeta(certContext.certification.id),
    ]);
    // Lesson content is the paid product; completing one you are not enrolled
    // in must not record progress against it.
    if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
      return Response.json({ nextHref: COURSES }, { status: 403 });
    }

    const allLessons = modules.flatMap((m) => m.lessons);

    // The completion write has to land before the progress read, or the
    // lesson just finished would be missing from the count.
    await markLessonComplete(user.uid, lessonId);
    const done = await getCompletedLessonIds(
      user.uid,
      allLessons.map((l) => l.id),
    );
    const percent =
      allLessons.length === 0
        ? 0
        : Math.round((done.size / allLessons.length) * 100);
    const index = allLessons.findIndex((l) => l.id === lessonId);
    const next = allLessons.slice(index + 1).find((l) => !done.has(l.id));

    // Nothing below depends on the percent write, but the learner should not
    // reach the next page before it lands, or a refresh would show stale
    // progress. It is the last hop, not a hidden one.
    await updateEnrollmentProgress(
      user.uid,
      certContext.certification.id,
      percent,
    );

    return Response.json({
      nextHref: next ? `/dashboard/learn/${next.id}` : COURSES,
    });
  } catch (e) {
    console.error("complete lesson failed", e);
    return Response.json(
      { error: "Could not save your progress." },
      { status: 500 },
    );
  }
}
