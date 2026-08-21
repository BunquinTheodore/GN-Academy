"use server";

import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import type { AdminFormState } from "@/components/admin/admin-form";
import { getSubmissionById, recordReview } from "@/lib/db/assignments";
import { maybeIssueCredential } from "@/lib/credentials/issue";

const schema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(["approve", "changes", "reject"]),
  note: z.string().trim().max(2000).optional(),
});

const STATUS = {
  approve: "approved",
  changes: "changes_requested",
  reject: "rejected",
} as const;

/**
 * A human deciding whether someone has earned a credential.
 *
 * Approving is the only path to a credential on an assignment course, so the
 * issuance is not done here by hand — it goes through maybeIssueCredential,
 * which re-checks enrollment, the approved submission, and whether one already
 * exists. That keeps the rules in one place and makes a double-click harmless.
 */
export async function reviewAssignmentAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const note = String(formData.get("note") ?? "").trim();
  const parsed = schema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    note: note || undefined,
  });
  if (!parsed.success) return { error: "Invalid request." };

  const { submissionId, decision } = parsed.data;

  // Sending someone away empty-handed without saying why is the one thing a
  // review must never do.
  if (decision !== "approve" && !parsed.data.note) {
    return {
      error:
        "Write a note explaining what needs to change. It is the only feedback they get.",
    };
  }

  const before = await getSubmissionById(submissionId);
  if (!before) return { error: "That submission no longer exists." };
  if (before.status !== "submitted") {
    return { error: "Someone has already reviewed this one." };
  }

  const reviewed = await recordReview({
    submissionId,
    status: STATUS[decision],
    reviewerId: admin.uid,
    note: parsed.data.note ?? null,
  });
  // recordReview only touches rows still awaiting a decision, so a null here
  // means another reviewer got there first.
  if (!reviewed) return { error: "Someone has already reviewed this one." };

  await auditLog({
    actorId: admin.uid,
    action: `assignment.${decision}d`,
    entity: "assignment_submission",
    entityId: submissionId,
    metadata: {
      certification_id: reviewed.assignments?.certification_id ?? null,
      attempt: reviewed.attempt_count,
    },
  });

  if (decision !== "approve") {
    return { ok: `Sent back to the learner as “${STATUS[decision]}”.` };
  }

  const certificationId = reviewed.assignments?.certification_id;
  if (!certificationId) {
    return { ok: "Approved, but the course could not be resolved to issue a credential." };
  }

  try {
    const outcome = await maybeIssueCredential({
      userId: reviewed.user_id,
      certificationId,
    });

    if (outcome.status === "issued") {
      await auditLog({
        actorId: admin.uid,
        action: "credential.issued",
        entity: "credential",
        entityId: outcome.credential.id,
        metadata: {
          credential_code: outcome.credential.credential_code,
          via: "assignment_review",
        },
      });
      return {
        ok: `Approved. Credential ${outcome.credential.credential_code} issued and emailed.`,
      };
    }
    if (outcome.status === "already") {
      return {
        ok: `Approved. They already held ${outcome.credential.credential_code}.`,
      };
    }
    return {
      ok: `Approved, but no credential was issued (${outcome.reason}). Check their enrollment.`,
    };
  } catch (e) {
    console.error("credential issue after approval failed", e);
    return {
      ok: "Approved, but issuing the credential failed. Their submission is approved, so retry from their record.",
    };
  }
}
