import "server-only";

import { getCourseCompletion } from "@/lib/db/course-progress";

export type FinalExamGate = {
  /**
   * Whether this course gates its exam at all. Only courses that carry chapter
   * quizzes do; see `getFinalExamGate` for why that is the deciding signal.
   */
  applies: boolean;
  ready: boolean;
  /**
   * Lessons not yet read. Reported even when `applies` is false, so a course
   * that does not gate its exam can still warn someone about to spend an
   * attempt on material they have not opened.
   */
  lessonsLeft: number;
  quizzesLeft: number;
  /** What the learner still has to do, or null when the exam is open. */
  reason: string | null;
};

/**
 * Whether a course's final exam is open to this learner yet.
 *
 * A course that pairs chapter quizzes with a final exam still allows only three
 * tries at that exam, so a learner who skips ahead spends a third of the
 * allowance on material they have not read. For those courses the course itself
 * is the entry requirement: every lesson read, every chapter quiz passed.
 *
 * The presence of chapter quizzes is the gate's own trigger, and deliberately
 * so. The two original exam courses (Certified AI Virtual Assistant, AI
 * Foundations) have none, so `getCourseCompletion` returns an empty quiz list
 * for them and this returns open without ever reading their lesson progress.
 * That matters: their exam has always been sittable before the last lesson, and
 * `allLessonsDone` would have closed it.
 *
 * Chapter quizzes themselves must never be passed in here. They are what the
 * gate asks for, so gating them would lock a learner out of their own course.
 * The caller decides that by checking `module_id`.
 */
export async function getFinalExamGate(
  userId: string,
  certificationId: string,
): Promise<FinalExamGate> {
  const completion = await getCourseCompletion(userId, certificationId);

  const quizzesLeft = completion.quizzes.filter((q) => !q.passed).length;
  const lessonsLeft = Math.max(
    0,
    completion.lessonsTotal - completion.lessonsDone,
  );

  // A course with no chapter quizzes is not gated, but the caller still wants
  // to know how much of it is unread so it can warn rather than block. That
  // count comes from the same read, so reporting it costs nothing.
  if (completion.quizzes.length === 0) {
    return { applies: false, ready: true, lessonsLeft, quizzesLeft: 0, reason: null };
  }
  // Counting what is left rather than reading allLessonsDone, which is false
  // for a course with no lessons at all and would shut the exam with nothing
  // to tell the learner to go and do.
  const ready = lessonsLeft === 0 && quizzesLeft === 0;

  return {
    applies: true,
    ready,
    lessonsLeft,
    quizzesLeft,
    reason: ready ? null : blockedReason(lessonsLeft, quizzesLeft),
  };
}

function blockedReason(lessonsLeft: number, quizzesLeft: number): string {
  const lessons = `${lessonsLeft} ${lessonsLeft === 1 ? "lesson" : "lessons"} left to read`;
  const quizzes = `${quizzesLeft} chapter ${quizzesLeft === 1 ? "quiz" : "quizzes"} left to pass`;

  if (quizzesLeft === 0) {
    return `Finish every lesson before you start the final exam. You have ${lessons}.`;
  }
  if (lessonsLeft === 0) {
    return `Pass every chapter quiz before you start the final exam. You have ${quizzes}.`;
  }
  return `Finish the course before you start the final exam. You have ${lessons} and ${quizzes}.`;
}
