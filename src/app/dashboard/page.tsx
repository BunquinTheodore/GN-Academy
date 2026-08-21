import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, BookOpen, Clock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileById, type Profile } from "@/lib/db/profiles";
import { listEnrollmentsForUser } from "@/lib/db/enrollments";
import { listCredentialsForUser } from "@/lib/db/credentials";
import {
  getModulesWithLessonMeta,
  listPublishedCertifications,
  type Certification,
} from "@/lib/db/certifications";
import { getCompletedLessonIds } from "@/lib/db/progress";
import { getCourseCompletion } from "@/lib/db/course-progress";
import { getAssignmentForCertification, getSubmission } from "@/lib/db/assignments";
import { profileCompleteness } from "@/lib/dashboard/completeness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type CourseCard = {
  cert: Certification;
  status: string;
  tone: "default" | "secondary" | "outline";
  percent: number;
  detail: string;
  href: string;
  cta: string;
};

/**
 * The one place a learner sees everything at once: what is running, what is
 * waiting on them, and what is waiting on us. Each card carries the single
 * next action for that course rather than a menu of possibilities — the
 * question someone opens this page with is "what do I do now".
 */
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  let profile: Profile | null = null;
  try {
    profile = await getProfileById(user.uid);
  } catch {
    profile = null;
  }

  const [enrollments, credentials, allCerts] = await Promise.all([
    listEnrollmentsForUser(user.uid).catch(() => []),
    listCredentialsForUser(user.uid).catch(() => []),
    listPublishedCertifications().catch(() => []),
  ]);

  const certById = new Map(allCerts.map((c) => [c.id, c]));

  const cards: CourseCard[] = [];
  for (const enrollment of enrollments) {
    const cert = certById.get(enrollment.certification_id);
    if (!cert) continue;

    if (enrollment.status === "pending") {
      cards.push({
        cert,
        status: "Awaiting payment",
        tone: "outline",
        percent: 0,
        detail: "We confirm GCash and Maya payments by hand, usually within 24 hours.",
        href: "/dashboard/courses",
        cta: "See details",
      });
      continue;
    }
    if (enrollment.status === "rejected") {
      cards.push({
        cert,
        status: "Payment not confirmed",
        tone: "outline",
        percent: 0,
        detail: "We couldn't match a payment to this enrollment. You can submit it again.",
        href: `/certifications/${cert.slug}/enroll`,
        cta: "Submit again",
      });
      continue;
    }

    const modules = await getModulesWithLessonMeta(cert.id).catch(() => []);
    const lessons = modules.flatMap((m) => m.lessons);
    const done = await getCompletedLessonIds(
      user.uid,
      lessons.map((l) => l.id),
    ).catch(() => new Set<string>());
    const percent =
      lessons.length === 0 ? 0 : Math.round((done.size / lessons.length) * 100);
    const nextLesson = lessons.find((l) => !done.has(l.id));

    const credential = credentials.find(
      (c) => c.certification_id === cert.id && c.status === "active",
    );
    if (credential) {
      cards.push({
        cert,
        status: "Certified",
        tone: "default",
        percent: 100,
        detail: `Credential ${credential.credential_code} is live and publicly verifiable.`,
        href: `/verify/${credential.credential_code}`,
        cta: "View credential",
      });
      continue;
    }

    if (nextLesson) {
      cards.push({
        cert,
        status: percent === 0 ? "Not started" : "In progress",
        tone: percent === 0 ? "outline" : "secondary",
        percent,
        detail: `${done.size} of ${lessons.length} lessons read.`,
        href: `/dashboard/learn/${nextLesson.id}`,
        cta: percent === 0 ? "Start learning" : "Continue",
      });
      continue;
    }

    // Lessons finished. What comes next depends on the shape of the course.
    if (cert.requires_assignment) {
      // Independent of each other, and this page is force-dynamic, so a
      // learner enrolled in several courses was paying for them one at a time.
      const [completion, assignment] = await Promise.all([
        getCourseCompletion(user.uid, cert.id).catch(() => null),
        getAssignmentForCertification(cert.id).catch(() => null),
      ]);
      const submission = assignment
        ? await getSubmission(assignment.id, user.uid).catch(() => null)
        : null;

      if (submission?.status === "submitted") {
        cards.push({
          cert,
          status: "Under review",
          tone: "secondary",
          percent,
          detail: "Your assignment is with a reviewer. You'll hear back either way.",
          href: `/dashboard/assignments/${cert.slug}`,
          cta: "View submission",
        });
      } else if (
        submission?.status === "changes_requested" ||
        submission?.status === "rejected"
      ) {
        cards.push({
          cert,
          status: "Changes requested",
          tone: "outline",
          percent,
          detail: "A reviewer left notes on your assignment. Resubmit when ready.",
          href: `/dashboard/assignments/${cert.slug}`,
          cta: "Read the feedback",
        });
      } else if (submission?.status === "approved") {
        // Approved, but the credential guard above found no active credential,
        // so issuing it failed or it was later revoked. Telling this learner to
        // "start the assignment" they have already passed is the worst thing
        // the dashboard can say, and the state is real: approving a submission
        // can succeed while issuing the credential fails.
        cards.push({
          cert,
          status: "Approved",
          tone: "secondary",
          percent,
          detail:
            "Your assignment passed. The credential is not live yet, so contact us if it does not appear shortly.",
          href: `/dashboard/assignments/${cert.slug}`,
          cta: "View submission",
        });
      } else if (completion && !completion.allQuizzesPassed) {
        const remaining = completion.quizzes.filter((q) => !q.passed);
        cards.push({
          cert,
          status: "Quizzes left",
          tone: "secondary",
          percent,
          detail: `${remaining.length} chapter ${remaining.length === 1 ? "quiz" : "quizzes"} still to pass.`,
          href: `/dashboard/assessments/${remaining[0]?.slug ?? ""}`,
          cta: "Take the quiz",
        });
      } else {
        cards.push({
          cert,
          status: "Assignment ready",
          tone: "secondary",
          percent,
          detail: "Every lesson read and every quiz passed. The assignment is open.",
          href: `/dashboard/assignments/${cert.slug}`,
          cta: "Start the assignment",
        });
      }
      continue;
    }

    cards.push({
      cert,
      status: "Exam ready",
      tone: "secondary",
      percent,
      detail: "All lessons done. Pass the exam and your credential is issued.",
      // The exam list takes no filter, so do not pretend it does.
      href: "/dashboard/assessments",
      cta: "Take the exam",
    });
  }

  const firstName = profile?.full_name?.trim().split(" ")[0];
  const completeness = profileCompleteness(profile);
  const needsAttention = cards.filter((c) =>
    ["Changes requested", "Quizzes left", "Assignment ready", "Exam ready"].includes(
      c.status,
    ),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {needsAttention.length > 0
            ? `${needsAttention.length} ${needsAttention.length === 1 ? "course needs" : "courses need"} something from you.`
            : cards.length > 0
              ? "Everything is up to date."
              : "You are not enrolled in anything yet."}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Courses" value={String(cards.length)} icon={BookOpen} />
        <Stat
          label="Credentials"
          value={String(credentials.filter((c) => c.status === "active").length)}
          icon={BadgeCheck}
        />
        <Stat label="Profile" value={`${completeness}%`} icon={Clock} />
      </section>

      {completeness < 100 && (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold">
                Finish your profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is what employers see. It stays private until you hold a
                credential, so filling it in now costs nothing.
              </p>
            </div>
            <Button asChild className="h-11">
              <Link href="/dashboard/profile">
                Complete profile
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <Progress
            value={completeness}
            aria-label={`Profile ${completeness}% complete`}
            className="mt-4"
          />
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold">Your courses</h2>

        {cards.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-8">
            <p className="text-sm text-muted-foreground">
              Nothing enrolled yet. Browse the catalogue and start with the free
              track. It costs nothing and ends in a real credential.
            </p>
            <Button asChild className="mt-4 h-11">
              <Link href="/certifications">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {cards.map((card) => (
              <article
                key={card.cert.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {card.cert.level}
                  </Badge>
                  <Badge variant={card.tone}>{card.status}</Badge>
                </div>

                <h3 className="font-display text-base font-semibold">
                  {card.cert.title}
                </h3>
                <p className="text-sm text-muted-foreground">{card.detail}</p>

                {card.percent > 0 && card.percent < 100 && (
                  <div className="flex items-center gap-3">
                    <Progress
                      value={card.percent}
                      aria-label={`${card.percent}% of lessons read`}
                      className="flex-1"
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {card.percent}%
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-1">
                  <Button asChild size="sm" className="h-10">
                    <Link href={card.href}>
                      {card.cta}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="text-xs tracking-wide uppercase">{label}</span>
      </div>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}
