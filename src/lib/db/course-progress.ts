import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type ChapterQuizState = {
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  assessmentId: string;
  slug: string;
  title: string;
  questionCount: number;
  passingScore: number;
  bestScore: number | null;
  passed: boolean;
};

export type CourseCompletion = {
  lessonsTotal: number;
  lessonsDone: number;
  percent: number;
  quizzes: ChapterQuizState[];
  allLessonsDone: boolean;
  allQuizzesPassed: boolean;
  /** Everything the course asks for before the final assignment opens. */
  readyForAssignment: boolean;
};

/**
 * How far through a course someone is, counting both the reading and the
 * chapter quizzes.
 *
 * The assignment is the expensive thing to review, so it stays shut until the
 * learner has actually done the course — otherwise the review queue fills with
 * work from people who skipped to the end.
 */
export async function getCourseCompletion(
  userId: string,
  certificationId: string,
): Promise<CourseCompletion> {
  const admin = supabaseAdmin();

  const { data: modules, error: moduleError } = await admin
    .from("modules")
    .select("id, title, sort_order, lessons(id)")
    .eq("certification_id", certificationId)
    .order("sort_order");
  if (moduleError) throw moduleError;

  const lessonIds = (modules ?? []).flatMap((m) =>
    ((m.lessons ?? []) as { id: string }[]).map((l) => l.id),
  );

  const { data: done, error: progressError } = lessonIds.length
    ? await admin
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId)
        .in("lesson_id", lessonIds)
    : { data: [], error: null };
  if (progressError) throw progressError;

  const { data: quizzes, error: quizError } = await admin
    .from("assessments")
    .select("id, slug, title, module_id, question_count, passing_score")
    .eq("certification_id", certificationId)
    .not("module_id", "is", null)
    .eq("is_published", true);
  if (quizError) throw quizError;

  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: attempts, error: attemptError } = quizIds.length
    ? await admin
        .from("attempts")
        .select("assessment_id, score, passed")
        .eq("user_id", userId)
        .in("assessment_id", quizIds)
        .not("completed_at", "is", null)
    : { data: [], error: null };
  if (attemptError) throw attemptError;

  const bestByAssessment = new Map<string, { score: number; passed: boolean }>();
  for (const a of attempts ?? []) {
    const prev = bestByAssessment.get(a.assessment_id);
    if (!prev || (a.score ?? 0) > prev.score) {
      bestByAssessment.set(a.assessment_id, {
        score: a.score ?? 0,
        passed: a.passed === true,
      });
    }
  }

  const moduleMeta = new Map(
    (modules ?? []).map((m) => [
      m.id as string,
      { title: m.title as string, order: (m.sort_order as number) ?? 0 },
    ]),
  );

  const quizStates: ChapterQuizState[] = (quizzes ?? [])
    .map((q) => {
      const best = bestByAssessment.get(q.id);
      const meta = moduleMeta.get(q.module_id as string);
      return {
        moduleId: q.module_id as string,
        moduleTitle: meta?.title ?? "Chapter",
        moduleOrder: meta?.order ?? 0,
        assessmentId: q.id,
        slug: q.slug,
        title: q.title,
        questionCount: q.question_count ?? 0,
        passingScore: q.passing_score ?? 70,
        bestScore: best?.score ?? null,
        passed: best?.passed ?? false,
      };
    })
    // Course order, not alphabetical — sorting by title put chapter 4 first.
    .sort((a, b) => a.moduleOrder - b.moduleOrder);

  const lessonsTotal = lessonIds.length;
  const lessonsDone = (done ?? []).length;
  const allLessonsDone = lessonsTotal > 0 && lessonsDone >= lessonsTotal;
  const allQuizzesPassed =
    quizStates.length === 0 || quizStates.every((q) => q.passed);

  return {
    lessonsTotal,
    lessonsDone,
    percent: lessonsTotal === 0 ? 0 : Math.round((lessonsDone / lessonsTotal) * 100),
    quizzes: quizStates,
    allLessonsDone,
    allQuizzesPassed,
    readyForAssignment: allLessonsDone && allQuizzesPassed,
  };
}

/** The chapter quiz attached to a module, if it has one. */
export async function getModuleQuiz(
  moduleId: string,
): Promise<{ id: string; slug: string; title: string } | null> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select("id, slug, title")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
