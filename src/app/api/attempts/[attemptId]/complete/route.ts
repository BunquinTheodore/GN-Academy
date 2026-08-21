import { z } from "zod";
import { canWriteAttempt } from "@/lib/assessment/ownership";
import { scoreAttempt } from "@/lib/assessment/scoring";
import { getScorableQuestions } from "@/lib/db/assessments";
import { completeAttempt, getAttemptById } from "@/lib/db/attempts";
import { createLead } from "@/lib/db/leads";
import { sendEmail } from "@/lib/email/send";
import { WelcomeEmail } from "@/lib/email/welcome";
import { env } from "@/lib/env";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        optionId: z.string().min(1).max(10),
      }),
    )
    .min(1)
    .max(50),
  // §14: email is optional and marketing consent is its own, unbundled flag.
  email: z.string().email().optional(),
  marketingConsent: z.boolean().optional(),
});

const paramsSchema = z.object({ attemptId: z.string().uuid() });

/** Score server-side (the client never sees correct answers) and capture the lead. */
export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return Response.json({ error: "Invalid attempt id." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    parsed.data.email &&
    !(await checkRateLimit(request, RATE_LIMITS.emailCapture))
  ) {
    return rateLimitedResponse();
  }

  try {
    const attempt = await getAttemptById(params.data.attemptId);
    if (!attempt) {
      return Response.json({ error: "Attempt not found." }, { status: 404 });
    }
    if (!(await canWriteAttempt(attempt))) {
      return Response.json({ error: "Not your attempt." }, { status: 403 });
    }
    if (attempt.completed_at) {
      // Idempotent: completing twice just returns the result URL again.
      return Response.json({ attemptId: attempt.id });
    }

    const questions = await getScorableQuestions(attempt.assessment_id);
    const result = scoreAttempt(questions, parsed.data.answers);

    // The write is the claim on the attempt: a racing second submission
    // loses it and must not capture the lead or send the email again.
    const claimed = await completeAttempt(attempt.id, {
      answers: parsed.data.answers,
      score: result.overall,
      competency_scores: result.competencies,
      level: result.level,
      recommended_path: result.recommendedPath,
      email: parsed.data.email ?? null,
    });
    if (!claimed) {
      return Response.json({ attemptId: attempt.id });
    }

    if (parsed.data.email) {
      await createLead({
        email: parsed.data.email,
        source: "ai-test",
        anon_id: attempt.anon_id,
        attempt_id: attempt.id,
        marketing_consent: parsed.data.marketingConsent === true,
      }).catch((e) => console.error("lead create failed", e));

      await sendEmail({
        to: parsed.data.email,
        subject: `Your AI Readiness score: ${result.overall}/100`,
        react: WelcomeEmail({
          score: result.overall,
          levelLabel: result.levelLabel,
          weakestLabel: result.weakest.label,
          resultsUrl: `${env.NEXT_PUBLIC_SITE_URL}/ai-test/results/${attempt.id}`,
        }),
      });
    }

    return Response.json({ attemptId: attempt.id });
  } catch (e) {
    console.error("attempt complete failed", e);
    return Response.json(
      { error: "Could not score your test. Your answers are saved, so try again." },
      { status: 500 },
    );
  }
}
