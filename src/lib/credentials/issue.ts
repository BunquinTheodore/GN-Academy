import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCredentialForUserAndCertification,
  issueCredential,
  type Credential,
} from "@/lib/db/credentials";
import { getEnrollment, markEnrollmentCompleted } from "@/lib/db/enrollments";
import { getAssignmentForCertification, getSubmission } from "@/lib/db/assignments";
import { getProfileById } from "@/lib/db/profiles";
import { sendEmail } from "@/lib/email/send";
import { CredentialIssuedEmail } from "@/lib/email/credential-issued";
import { env } from "@/lib/env";
import type { CompetencyResult } from "@/lib/assessment/scoring";

export type IssueOutcome =
  | { status: "issued"; credential: Credential }
  | { status: "already"; credential: Credential }
  | {
      status: "blocked";
      reason:
        | "no-certification"
        | "not-enrolled"
        | "assignment-not-approved"
        | "exam-not-passed";
    };

/**
 * The single place a credential is released.
 *
 * There are now two ways to finish a course — pass the final exam, or have a
 * reviewer approve the final assignment — and both end here, because the
 * conditions are the same either way and duplicating them is how a credential
 * eventually gets issued to someone who did not earn it. Every prerequisite is
 * re-checked from the database rather than trusted from the caller.
 */
export async function maybeIssueCredential(input: {
  userId: string;
  certificationId: string;
  /** Falls back to the learner's own quiz history when not supplied. */
  competencies?: CompetencyResult[];
}): Promise<IssueOutcome> {
  const admin = supabaseAdmin();

  const { data: cert } = await admin
    .from("certifications")
    .select("*")
    .eq("id", input.certificationId)
    .maybeSingle();
  if (!cert) return { status: "blocked", reason: "no-certification" };

  const existing = await getCredentialForUserAndCertification(
    input.userId,
    input.certificationId,
  );
  if (existing) return { status: "already", credential: existing };

  const enrollment = await getEnrollment(input.userId, input.certificationId);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    return { status: "blocked", reason: "not-enrolled" };
  }

  // Assignment courses: a human has to have said yes.
  if (cert.requires_assignment) {
    const assignment = await getAssignmentForCertification(input.certificationId);
    if (!assignment) return { status: "blocked", reason: "assignment-not-approved" };
    const submission = await getSubmission(assignment.id, input.userId);
    if (submission?.status !== "approved") {
      return { status: "blocked", reason: "assignment-not-approved" };
    }
  } else {
    // Exam courses: there has to be a passing attempt on the final exam.
    const { data: finalExams } = await admin
      .from("assessments")
      .select("id")
      .eq("certification_id", input.certificationId)
      .is("module_id", null)
      .eq("is_published", true);

    // No published final exam means there is nothing to have passed. Treating
    // that as "no requirement" would issue a credential to anyone enrolled the
    // moment an admin unpublished the exam.
    if (!finalExams || finalExams.length === 0) {
      return { status: "blocked", reason: "exam-not-passed" };
    }

    const { data: passed } = await admin
      .from("attempts")
      .select("id")
      .eq("user_id", input.userId)
      .in(
        "assessment_id",
        finalExams.map((e) => e.id),
      )
      .eq("passed", true)
      .limit(1);
    if (!passed || passed.length === 0) {
      return { status: "blocked", reason: "exam-not-passed" };
    }
  }

  const competencies =
    input.competencies ??
    (await competenciesFromAttempts(input.userId, input.certificationId));

  const profile = await getProfileById(input.userId);
  const holderName =
    profile?.full_name?.trim() || profile?.email || "GN Academy member";

  const credential = await issueCredential({
    user_id: input.userId,
    certification_id: input.certificationId,
    credential_prefix: cert.credential_prefix,
    holder_name: holderName,
    title: cert.title,
    level: cert.level,
    competencies,
  });

  await markEnrollmentCompleted(input.userId, input.certificationId);

  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: `Your credential is live: ${credential.credential_code}`,
      react: CredentialIssuedEmail({
        holderName,
        title: cert.title,
        credentialCode: credential.credential_code,
        verifyUrl: `${env.NEXT_PUBLIC_SITE_URL}/verify/${credential.credential_code}`,
      }),
    });
  }

  return { status: "issued", credential };
}

/**
 * Builds the credential's competency breakdown out of the chapter quizzes the
 * learner actually sat, taking their best attempt at each.
 *
 * An assignment-based course has no final exam to score, and a credential with
 * no breakdown is worth noticeably less to the employer reading it — the whole
 * pitch is that two people who both passed are still distinguishable.
 */
async function competenciesFromAttempts(
  userId: string,
  certificationId: string,
): Promise<CompetencyResult[]> {
  const admin = supabaseAdmin();

  const { data: assessments } = await admin
    .from("assessments")
    .select("id")
    .eq("certification_id", certificationId);
  if (!assessments || assessments.length === 0) return [];

  const { data: attempts } = await admin
    .from("attempts")
    .select("assessment_id, score, competency_scores")
    .eq("user_id", userId)
    .in(
      "assessment_id",
      assessments.map((a) => a.id),
    )
    .not("completed_at", "is", null)
    .order("score", { ascending: false });
  if (!attempts || attempts.length === 0) return [];

  // Best attempt per assessment only, so retaking a quiz does not let a weak
  // early score drag the average down.
  const best = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    if (!best.has(a.assessment_id)) best.set(a.assessment_id, a);
  }

  const totals = new Map<string, { label: string; sum: number; n: number }>();
  for (const attempt of best.values()) {
    const scores = (attempt.competency_scores ?? []) as CompetencyResult[];
    for (const c of scores) {
      if (!c?.key || typeof c.score !== "number") continue;
      const bucket = totals.get(c.key) ?? { label: c.label ?? c.key, sum: 0, n: 0 };
      bucket.sum += c.score;
      bucket.n += 1;
      totals.set(c.key, bucket);
    }
  }

  return [...totals.entries()].map(([key, v]) => ({
    key: key as CompetencyResult["key"],
    label: v.label,
    weight: 0,
    correct: 0,
    total: 0,
    score: Math.round(v.sum / Math.max(1, v.n)),
  }));
}
