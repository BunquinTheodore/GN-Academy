import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listEnrollmentsForUser } from "@/lib/db/enrollments";
import {
  getModulesWithLessonMeta,
  listPublishedCertifications,
} from "@/lib/db/certifications";
import { getCompletedLessonIds } from "@/lib/db/progress";
import { getCredentialForUserAndCertification } from "@/lib/db/credentials";
import { getCourseCompletion } from "@/lib/db/course-progress";
import { listPublishedExams } from "@/lib/db/exams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "My courses" };

export default async function CoursesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/courses");

  const [enrollments, certifications, exams] = await Promise.all([
    listEnrollmentsForUser(user.uid).catch(() => []),
    listPublishedCertifications().catch(() => []),
    listPublishedExams().catch(() => []),
  ]);
  const certById = new Map(certifications.map((c) => [c.id, c]));
  // One read for the whole page, so "take the exam" can point at the exam
  // itself. A course with no published final exam is a real state, since an
  // admin can unpublish one, so every use of this map falls back.
  const examSlugByCertId = new Map(
    exams.flatMap((exam) =>
      exam.certification_id ? [[exam.certification_id, exam.slug] as const] : [],
    ),
  );

  const cards = await Promise.all(
    enrollments.map(async (enrollment) => {
      const cert = certById.get(enrollment.certification_id);
      if (!cert) return null;
      const modules = await getModulesWithLessonMeta(cert.id).catch(() => []);
      const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
      const done = await getCompletedLessonIds(user.uid, lessonIds).catch(
        () => new Set<string>(),
      );
      const firstIncomplete = modules
        .flatMap((m) => m.lessons)
        .find((l) => !done.has(l.id));
      // Chapter quizzes stand between the reading and whatever ends the course,
      // an assignment for some courses and a final exam for others, so the card
      // has to show more than a bar. A course with no chapter quizzes comes back
      // with an empty quiz list and renders exactly as it did before. A card
      // the learner cannot open yet shows a payment message and nothing else,
      // so it does not pay for this read.
      const isOpen =
        enrollment.status !== "pending" && enrollment.status !== "rejected";
      const completion = isOpen
        ? await getCourseCompletion(user.uid, cert.id).catch(() => null)
        : null;
      const credential =
        enrollment.status === "completed"
          ? await getCredentialForUserAndCertification(user.uid, cert.id).catch(
              () => null,
            )
          : null;
      const percent =
        lessonIds.length === 0
          ? 0
          : Math.round((done.size / lessonIds.length) * 100);
      // The exam on a course with chapter quizzes will not open until these are
      // passed, so the card sends the learner to the quiz rather than to a
      // button that refuses them.
      const nextQuiz = completion?.quizzes.find((q) => !q.passed) ?? null;
      // Link to this course's own exam. This used to pass ?cert= to the exam
      // list, which ignores the query string entirely, so the learner landed on
      // every exam they are enrolled in and had to pick. The bare list is still
      // the fallback when no published exam resolves.
      const examSlug = examSlugByCertId.get(cert.id);
      const examHref = examSlug
        ? `/dashboard/assessments/${examSlug}`
        : "/dashboard/assessments";
      return {
        enrollment,
        cert,
        percent,
        firstIncomplete,
        credential,
        completion,
        nextQuiz,
        examHref,
      };
    }),
  );

  const visible = cards.filter(Boolean) as NonNullable<(typeof cards)[number]>[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lessons first, then the exam, then the credential.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
          <p className="text-muted-foreground">
            You&apos;re not enrolled in anything yet. The free AI Foundations
            course is the usual starting point.
          </p>
          <Button asChild>
            <Link href="/certifications">Browse certifications</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map(
            ({
              enrollment,
              cert,
              percent,
              firstIncomplete,
              credential,
              completion,
              nextQuiz,
              examHref,
            }) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{cert.title}</CardTitle>
                  <Badge
                    variant={
                      enrollment.status === "active"
                        ? "default"
                        : enrollment.status === "completed"
                          ? "secondary"
                          : "outline"
                    }
                    className="capitalize"
                  >
                    {enrollment.status === "pending"
                      ? "Awaiting payment confirmation"
                      : enrollment.status === "rejected"
                        ? "Payment not confirmed"
                        : enrollment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {enrollment.status === "pending" ? (
                  <p className="text-sm text-muted-foreground">
                    We&apos;re matching your payment reference, usually within
                    24 hours. You&apos;ll get an email the moment it clears.
                  </p>
                ) : enrollment.status === "rejected" ? (
                  // Never show a progress bar and a "Start learning" button
                  // for a course the learner cannot open.
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      We couldn&apos;t match a payment to this enrollment. If
                      you paid, submit it again with the reference number from
                      your receipt. Nothing is lost.
                    </p>
                    <div>
                      <Button asChild size="sm">
                        <Link href={`/certifications/${cert.slug}/enroll`}>
                          Submit it again
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Lesson progress
                        </span>
                        <span className="font-mono">{percent}%</span>
                      </div>
                      <Progress value={percent} aria-label={`${percent}% of lessons done`} />
                    </div>
                    {completion && completion.quizzes.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {completion.quizzes.map((q) => (
                          <li key={q.assessmentId}>
                            <Link
                              href={`/dashboard/assessments/${q.slug}`}
                              className="hover:text-foreground"
                            >
                              {q.moduleTitle} quiz:{" "}
                              {q.passed ? (
                                <span className="text-primary">
                                  passed, {q.bestScore}%
                                </span>
                              ) : q.bestScore === null ? (
                                "not taken yet"
                              ) : (
                                `best ${q.bestScore}%, need ${q.passingScore}%`
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {firstIncomplete ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/learn/${firstIncomplete.id}`}>
                            {percent === 0 ? "Start learning" : "Continue"}
                          </Link>
                        </Button>
                      ) : nextQuiz ? (
                        // One branch for both shapes of course, since an
                        // outstanding chapter quiz is what stands in the way
                        // either way. Sending the learner to the quiz beats
                        // sending them to the ending that will refuse them.
                        <Button asChild size="sm">
                          <Link href={`/dashboard/assessments/${nextQuiz.slug}`}>
                            Take the chapter quiz
                          </Link>
                        </Button>
                      ) : cert.requires_assignment ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/assignments/${cert.slug}`}>
                            Go to the assignment
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href={examHref}>Take the exam</Link>
                        </Button>
                      )}
                      {credential && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/verify/${credential.credential_code}`}>
                            View credential
                          </Link>
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
