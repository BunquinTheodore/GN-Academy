"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCertificationForLesson,
  getModulesWithLessonMeta,
} from "@/lib/db/certifications";
import { getEnrollment, updateEnrollmentProgress } from "@/lib/db/enrollments";
import { getCompletedLessonIds, markLessonComplete } from "@/lib/db/progress";

const schema = z.object({ lessonId: z.string().uuid() });

export async function completeLessonAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/courses");

  const parsed = schema.safeParse({ lessonId: formData.get("lessonId") });
  if (!parsed.success) redirect("/dashboard/courses");

  const context = await getCertificationForLesson(parsed.data.lessonId).catch(
    () => null,
  );
  if (!context) redirect("/dashboard/courses");

  const enrollment = await getEnrollment(
    user.uid,
    context.certification.id,
  ).catch(() => null);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    redirect("/dashboard/courses");
  }

  await markLessonComplete(user.uid, parsed.data.lessonId);

  const modules = await getModulesWithLessonMeta(context.certification.id);
  const allLessons = modules.flatMap((m) => m.lessons);
  const done = await getCompletedLessonIds(
    user.uid,
    allLessons.map((l) => l.id),
  );
  const percent =
    allLessons.length === 0
      ? 0
      : Math.round((done.size / allLessons.length) * 100);
  await updateEnrollmentProgress(user.uid, context.certification.id, percent);

  const index = allLessons.findIndex((l) => l.id === parsed.data.lessonId);
  const next = allLessons.slice(index + 1).find((l) => !done.has(l.id));

  if (next) redirect(`/dashboard/learn/${next.id}`);
  redirect("/dashboard/courses");
}
