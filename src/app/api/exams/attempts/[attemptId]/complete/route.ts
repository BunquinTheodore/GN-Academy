import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { scoreAttempt } from "@/lib/assessment/scoring";
import { getScorableQuestions } from "@/lib/db/assessments";
import { completeAttempt, getAttemptById } from "@/lib/db/attempts";
import { supabaseAdmin } from "@/lib/supabase/server";
import { maybeIssueCredential } from "@/lib/credentials/issue";

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

    // Chapter quizzes are formative: you retake them until they stick, and
    // passing one has never been the thing that earns a credential.
    if (passed && assessment.certification_id && assessment.type !== "chapter") {
      const outcome = await maybeIssueCredential({
        userId: user.uid,
        certificationId: assessment.certification_id,
        competencies: result.competencies,
      });
      if (outcome.status === "issued" || outcome.status === "already") {
        credentialCode = outcome.credential.credential_code;
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
