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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "My courses" };

export default async function CoursesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/courses");

  const [enrollments, certifications] = await Promise.all([
    listEnrollmentsForUser(user.uid).catch(() => []),
    listPublishedCertifications().catch(() => []),
  ]);
  const certById = new Map(certifications.map((c) => [c.id, c]));

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
      return { enrollment, cert, percent, firstIncomplete, credential };
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
          {visible.map(({ enrollment, cert, percent, firstIncomplete, credential }) => (
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
                    We&apos;re matching your payment reference — usually within
                    24 hours. You&apos;ll get an email the moment it clears.
                  </p>
                ) : enrollment.status === "rejected" ? (
                  // Never show a progress bar and a "Start learning" button
                  // for a course the learner cannot open.
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      We couldn&apos;t match a payment to this enrollment. If
                      you paid, submit it again with the reference number from
                      your receipt — nothing is lost.
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
                    <div className="flex flex-wrap gap-2">
                      {firstIncomplete ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/learn/${firstIncomplete.id}`}>
                            {percent === 0 ? "Start learning" : "Continue"}
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/assessments?cert=${cert.slug}`}>
                            Take the exam
                          </Link>
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
