import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { scoreAttempt } from "@/lib/assessment/scoring";
import { getScorableQuestions } from "@/lib/db/assessments";
import { completeAttempt, getAttemptById } from "@/lib/db/attempts";
import { supabaseAdmin } from "@/lib/supabase/server";
import { markEnrollmentCompleted, getEnrollment } from "@/lib/db/enrollments";
import {
  getCredentialForUserAndCertification,
  issueCredential,
} from "@/lib/db/credentials";
import { getProfileById } from "@/lib/db/profiles";
import { sendEmail } from "@/lib/email/send";
import { CredentialIssuedEmail } from "@/lib/email/credential-issued";
import { env } from "@/lib/env";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        optionId: z.string().min(1).max(10),
      }),
    )
    .min(1)
    .max(100),
});

const paramsSchema = z.object({ attemptId: z.string().uuid() });

/**
 * Score an exam attempt server-side. On a pass with an active enrollment:
 * mark the enrollment completed, issue the credential atomically, audit-log,
 * and email the holder.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to submit the exam." }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return Response.json({ error: "Invalid attempt." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const attempt = await getAttemptById(params.data.attemptId);
    if (!attempt || attempt.user_id !== user.uid) {
      return Response.json({ error: "Not your attempt." }, { status: 403 });
    }
    if (attempt.completed_at) {
      return Response.json(
        { error: "This attempt was already submitted." },
        { status: 409 },
      );
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin()
      .from("assessments")
      .select("id, slug, title, type, passing_score, certification_id")
      .eq("id", attempt.assessment_id)
      .single();
    if (assessmentError) throw assessmentError;

    const questions = await getScorableQuestions(attempt.assessment_id);
    const result = scoreAttempt(questions, parsed.data.answers);
    const passingScore = assessment.passing_score ?? 70;
    const passed = result.overall >= passingScore;

    // Whoever wins this write owns the attempt. A second, racing submission
    // loses it and must not go on to issue a second credential.
    const claimed = await completeAttempt(attempt.id, {
      answers: parsed.data.answers,
      score: result.overall,
      competency_scores: result.competencies,
      level: result.level,
      recommended_path: result.recommendedPath,
      passed,
    });
    if (!claimed) {
      return Response.json(
        { error: "This attempt was already submitted." },
        { status: 409 },
      );
    }

    let credentialCode: string | null = null;

    if (passed && assessment.certification_id) {
      const { data: cert } = await supabaseAdmin()
        .from("certifications")
        .select("*")
        .eq("id", assessment.certification_id)
        .single();

      const enrollment = await getEnrollment(user.uid, assessment.certification_id);
      if (cert && enrollment && ["active", "completed"].includes(enrollment.status)) {
        const existing = await getCredentialForUserAndCertification(
          user.uid,
          assessment.certification_id,
        );
        if (existing) {
          credentialCode = existing.credential_code;
        } else {
          const profile = await getProfileById(user.uid);
          const holderName =
            profile?.full_name?.trim() || profile?.email || "GN Academy member";

          const credential = await issueCredential({
            user_id: user.uid,
            certification_id: assessment.certification_id,
            credential_prefix: cert.credential_prefix,
            holder_name: holderName,
            title: cert.title,
            level: cert.level,
            competencies: result.competencies,
          });
          credentialCode = credential.credential_code;

          await markEnrollmentCompleted(user.uid, assessment.certification_id);

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
        }
      }
    }

    return Response.json({
      score: result.overall,
      passed,
      passingScore,
      competencies: result.competencies,
      credentialCode,
    });
  } catch (e) {
    console.error("exam complete failed", e);
    return Response.json(
      { error: "Could not score your exam. Your answers are safe — try again." },
      { status: 500 },
    );
  }
}
