import type { Metadata } from "next";
import Link from "next/link";
import { listSubmissionsForReview, type SubmissionStatus } from "@/lib/db/assignments";
import { formatDate } from "@/lib/format";
import { AdminForm } from "@/components/admin/admin-form";
import { TextAreaField } from "@/components/admin/field";
import { Badge } from "@/components/ui/badge";
import { reviewAssignmentAction } from "./actions";

export const metadata: Metadata = {
  title: "Assignments",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS: { value: SubmissionStatus | "all"; label: string }[] = [
  { value: "submitted", label: "Awaiting review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Not passed" },
  { value: "all", label: "All" },
];

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = (TABS.find((t) => t.value === status)?.value ??
    "submitted") as SubmissionStatus | "all";

  const submissions = await listSubmissionsForReview(active).catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving one issues the learner&apos;s credential and emails them.
          Sending it back needs a note — it is the only feedback they get.
        </p>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/assignments?status=${tab.value}`}
            aria-current={active === tab.value ? "page" : undefined}
            className={
              active === tab.value
                ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-primary/50"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {submissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
          Nothing here.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {submissions.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.profiles?.full_name ?? s.profiles?.email ?? "Unknown learner"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.assignments?.certifications?.title ?? "Unknown course"} ·{" "}
                    {s.assignments?.title ?? "Assignment"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {formatDate(s.submitted_at)}
                    {s.attempt_count > 1 && ` · attempt ${s.attempt_count}`}
                  </p>
                </div>
                <Badge variant={s.status === "approved" ? "default" : "outline"}>
                  {s.status.replace("_", " ")}
                </Badge>
              </div>

              {s.assignments?.criteria?.length ? (
                <div className="mt-4 rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium tracking-wide uppercase">
                    Check for
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                    {s.assignments.criteria.map((c) => (
                      <li key={c}>— {c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer list-none text-sm font-medium">
                  Read the submission ({s.content.trim().split(/\s+/).length} words)
                </summary>
                <div className="mt-2 max-h-[28rem] overflow-y-auto rounded-md border border-border bg-background p-4">
                  <p className="text-sm whitespace-pre-wrap">{s.content}</p>
                </div>
                {s.link_url && (
                  <p className="mt-2 text-sm">
                    Link:{" "}
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline underline-offset-4"
                    >
                      {s.link_url}
                    </a>
                  </p>
                )}
              </details>

              {s.reviewer_note && (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Reviewer note:</span>{" "}
                  {s.reviewer_note}
                </p>
              )}

              {s.status === "submitted" && (
                <div className="mt-5 border-t border-border pt-4">
                  <AdminForm action={reviewAssignmentAction} submitLabel="Approve">
                    <input type="hidden" name="submissionId" value={s.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <TextAreaField
                      name="note"
                      label="Note to the learner (optional when approving)"
                      rows={3}
                    />
                  </AdminForm>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <AdminForm
                      action={reviewAssignmentAction}
                      submitLabel="Request changes"
                    >
                      <input type="hidden" name="submissionId" value={s.id} />
                      <input type="hidden" name="decision" value="changes" />
                      <TextAreaField
                        name="note"
                        label="What needs to change"
                        rows={3}
                        required
                      />
                    </AdminForm>

                    <AdminForm
                      action={reviewAssignmentAction}
                      submitLabel="Not passed"
                      destructive
                    >
                      <input type="hidden" name="submissionId" value={s.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <TextAreaField name="note" label="Why" rows={3} required />
                    </AdminForm>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
