import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getFinalExamGate } from "@/lib/assessment/exam-gate";
import { getPublicQuestions } from "@/lib/db/assessments";
import { getCertificationById } from "@/lib/db/certifications";
import { getEnrollment } from "@/lib/db/enrollments";
import {
  countCompletedAttempts,
  getPublishedExamBySlug,
} from "@/lib/db/exams";
import { Button } from "@/components/ui/button";
import { ExamPlayer } from "./exam-player";

export const metadata: Metadata = {
  title: "Exam",
  robots: { index: false, follow: false },
};

const paramsSchema = z.object({ slug: z.string().min(1).max(100) });

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) notFound();

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/assessments/${parsed.data.slug}`)}`);
  }

  const exam = await getPublishedExamBySlug(parsed.data.slug).catch(() => null);
  if (!exam) notFound();

  const isChapterQuiz = exam.type === "chapter";
  let isFreeTrack = false;
  let courseSlug: string | null = null;
  let hasAssignment = false;
  if (exam.certification_id) {
    const enrollment = await getEnrollment(user.uid, exam.certification_id).catch(
      () => null,
    );
    if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
      redirect("/dashboard/assessments");
    }
    const cert = await getCertificationById(exam.certification_id).catch(
      () => null,
    );
    isFreeTrack = cert?.is_free ?? false;
    courseSlug = cert?.slug ?? null;
    // Only assignment courses have a page to send anyone to.
    hasAssignment = cert?.requires_assignment ?? false;
  }

  const used = await countCompletedAttempts(user.uid, exam.id).catch(() => 0);
  if (used >= exam.max_attempts) redirect("/dashboard/assessments");

  // The gate that counts is in POST /api/exams/[slug]/attempts. This is the
  // same answer given before the click, because offering someone a Start button
  // that the server will refuse is worse than not offering it. Chapter quizzes
  // (module_id set) are never gated: passing them is what opens the exam.
  const gate =
    exam.module_id === null && exam.certification_id
      ? await getFinalExamGate(user.uid, exam.certification_id).catch(() => null)
      : null;
  if (gate?.reason) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-semibold">{exam.title}</h1>
        <p className="mt-3 text-muted-foreground">{gate.reason}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The exam allows {exam.max_attempts} attempts, so it stays shut until
          the course is behind you.
        </p>
        <Button asChild className="mt-5 h-12">
          <Link href="/dashboard/courses">Back to the course</Link>
        </Button>
      </div>
    );
  }

  const questions = await getPublicQuestions(exam.id).catch(() => []);
  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-semibold">{exam.title}</h1>
        <p className="mt-3 text-muted-foreground">
          This exam&apos;s questions are being prepared. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <ExamPlayer
      isFreeTrack={isFreeTrack}
      isChapterQuiz={isChapterQuiz}
      courseSlug={hasAssignment ? courseSlug : null}
      examSlug={exam.slug}
      examTitle={exam.title}
      passingScore={exam.passing_score ?? 70}
      attemptsRemaining={exam.max_attempts - used}
      questions={questions}
    />
  );
}
