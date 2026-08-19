import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicQuestions } from "@/lib/db/assessments";
import { getEnrollment } from "@/lib/db/enrollments";
import {
  countCompletedAttempts,
  getPublishedExamBySlug,
} from "@/lib/db/exams";
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

  if (exam.certification_id) {
    const enrollment = await getEnrollment(user.uid, exam.certification_id).catch(
      () => null,
    );
    if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
      redirect("/dashboard/assessments");
    }
  }

  const used = await countCompletedAttempts(user.uid, exam.id).catch(() => 0);
  if (used >= exam.max_attempts) redirect("/dashboard/assessments");

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
      examSlug={exam.slug}
      examTitle={exam.title}
      passingScore={exam.passing_score ?? 70}
      attemptsRemaining={exam.max_attempts - used}
      questions={questions}
    />
  );
}
