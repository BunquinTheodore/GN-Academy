import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listEnrollmentsForUser } from "@/lib/db/enrollments";
import {
  countCompletedAttempts,
  getBestAttempt,
  listPublishedExams,
} from "@/lib/db/exams";
import { listPublishedCertifications } from "@/lib/db/certifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Exams" };

export default async function AssessmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/assessments");

  const [enrollments, exams, certifications] = await Promise.all([
    listEnrollmentsForUser(user.uid).catch(() => []),
    listPublishedExams().catch(() => []),
    listPublishedCertifications().catch(() => []),
  ]);

  const enrolledCertIds = new Set(
    enrollments
      .filter((e) => ["active", "completed"].includes(e.status))
      .map((e) => e.certification_id),
  );
  const certById = new Map(certifications.map((c) => [c.id, c]));

  const available = await Promise.all(
    exams
      .filter((exam) => exam.certification_id && enrolledCertIds.has(exam.certification_id))
      .map(async (exam) => ({
        exam,
        cert: certById.get(exam.certification_id!),
        used: await countCompletedAttempts(user.uid, exam.id).catch(() => 0),
        best: await getBestAttempt(user.uid, exam.id).catch(() => null),
      })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Exams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pass the exam for an enrolled certification and your credential is
          issued on the spot.
        </p>
      </div>

      {available.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
          <p className="text-muted-foreground">
            Exams unlock with an active enrollment. Start with a course and the
            exam appears here.
          </p>
          <Button asChild>
            <Link href="/certifications">Browse certifications</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {available.map(({ exam, cert, used, best }) => {
            const attemptsLeft = exam.max_attempts - used;
            const passed = best?.passed === true;
            return (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    {passed ? (
                      <Badge>Passed</Badge>
                    ) : (
                      <Badge variant="outline">
                        {attemptsLeft} of {exam.max_attempts} attempts left
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {exam.question_count} questions · pass mark{" "}
                    {exam.passing_score ?? 70}%
                    {best && (
                      <>
                        {" "}
                        · best score{" "}
                        <span className="font-mono">{best.score}</span>
                      </>
                    )}
                  </p>
                  {passed ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/credentials">
                        View my credential
                      </Link>
                    </Button>
                  ) : attemptsLeft > 0 ? (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/assessments/${exam.slug}`}>
                        {used === 0 ? "Start the exam" : "Retake the exam"}
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No attempts remaining. Email{" "}
                      {cert ? `us about ${cert.title}` : "us"} if you believe
                      this is wrong.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
