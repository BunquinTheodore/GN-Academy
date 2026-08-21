import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, BadgeCheck, CircleAlert, Clock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getPublishedCertificationBySlug } from "@/lib/db/certifications";
import { getEnrollment } from "@/lib/db/enrollments";
import { getCourseCompletion } from "@/lib/db/course-progress";
import { getAssignmentForCertification, getSubmission } from "@/lib/db/assignments";
import { getCredentialForUserAndCertification } from "@/lib/db/credentials";
import { AdminForm } from "@/components/admin/admin-form";
import { TextAreaField, TextField } from "@/components/admin/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { submitAssignmentAction } from "./actions";

export const metadata: Metadata = { title: "Assignment" };
export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/assignments/${slug}`);

  const cert = await getPublishedCertificationBySlug(slug).catch(() => null);
  if (!cert) notFound();

  const enrollment = await getEnrollment(user.uid, cert.id).catch(() => null);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    redirect("/dashboard/courses");
  }

  const assignment = await getAssignmentForCertification(cert.id);
  if (!assignment) notFound();

  const [completion, submission, credential] = await Promise.all([
    getCourseCompletion(user.uid, cert.id),
    getSubmission(assignment.id, user.uid),
    getCredentialForUserAndCertification(user.uid, cert.id).catch(() => null),
  ]);

  const locked = !completion.readyForAssignment;
  const approved = submission?.status === "approved";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/courses"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          My courses
        </Link>
        <p className="mt-2 font-mono text-xs tracking-wider text-primary uppercase">
          {cert.title}
        </p>
        <h1 className="font-display mt-1 text-2xl font-semibold">
          {assignment.title}
        </h1>
      </div>

      {approved && (
        <Alert>
          <BadgeCheck className="size-4" aria-hidden />
          <AlertDescription>
            <span className="font-medium text-foreground">Approved.</span>{" "}
            {credential ? (
              <>
                Your credential{" "}
                <Link
                  href={`/verify/${credential.credential_code}`}
                  className="font-mono underline underline-offset-4"
                >
                  {credential.credential_code}
                </Link>{" "}
                is live and publicly verifiable.
              </>
            ) : (
              "Your credential is being prepared. Check your credentials page in a moment."
            )}
            {submission?.reviewer_note && (
              <span className="mt-2 block">{submission.reviewer_note}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {submission?.status === "submitted" && (
        <Alert>
          <Clock className="size-4" aria-hidden />
          <AlertDescription>
            Submitted and waiting for a reviewer. You&apos;ll hear back either
            way. You can still replace it below until someone picks it up.
          </AlertDescription>
        </Alert>
      )}

      {(submission?.status === "changes_requested" ||
        submission?.status === "rejected") && (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden />
          <AlertDescription>
            <span className="font-medium">
              {submission.status === "rejected"
                ? "Not passed yet."
                : "Changes requested."}
            </span>
            {submission.reviewer_note && (
              <span className="mt-2 block">{submission.reviewer_note}</span>
            )}
            <span className="mt-2 block">
              Edit your work below and send it again. There is no limit on
              attempts.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <section className="prose prose-sm max-w-none text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground">
        <MDXRemote source={assignment.brief_mdx} />
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold">
          What the reviewer checks
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          {assignment.criteria.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="text-primary">
                ·
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Minimum length: {assignment.min_words} words.
        </p>
      </section>

      {locked ? (
        <section className="rounded-lg border border-dashed border-border p-6">
          <h2 className="font-display text-base font-semibold">
            Finish the course first
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The assignment opens once you have read every lesson and passed each
            chapter quiz. A reviewer reads these by hand, so it is worth
            arriving prepared.
          </p>
          <ul className="mt-4 flex flex-col gap-1.5 text-sm">
            <li className={completion.allLessonsDone ? "text-primary" : ""}>
              Lessons: {completion.lessonsDone} of {completion.lessonsTotal}
            </li>
            {completion.quizzes.map((q) => (
              <li key={q.assessmentId} className={q.passed ? "text-primary" : ""}>
                {q.moduleTitle} quiz:{" "}
                {q.passed
                  ? `passed (${q.bestScore}%)`
                  : q.bestScore === null
                    ? "not attempted"
                    : `best ${q.bestScore}%, need ${q.passingScore}%`}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-5 h-11">
            <Link href="/dashboard/courses">Back to the course</Link>
          </Button>
        </section>
      ) : approved ? null : (
        <section>
          <h2 className="font-display text-base font-semibold">
            Your submission
          </h2>
          <div className="mt-3">
            <AdminForm
              action={submitAssignmentAction}
              submitLabel={submission ? "Send it again" : "Submit for review"}
            >
              <input type="hidden" name="slug" value={cert.slug} />
              <TextAreaField
                name="content"
                label="Your work"
                rows={18}
                required
                defaultValue={submission?.content ?? undefined}
                hint="Write it here. Plain text or Markdown both read fine."
              />
              <TextField
                name="link_url"
                label="Link (optional)"
                type="url"
                defaultValue={submission?.link_url ?? undefined}
                hint="A public link to anything supporting your work: a doc, a post, a spreadsheet."
              />
            </AdminForm>
          </div>
        </section>
      )}
    </div>
  );
}
