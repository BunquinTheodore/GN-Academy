import { z } from "zod";
import { getOrSetAnonId } from "@/lib/auth/anon";
import { getSessionUser } from "@/lib/auth/session";
import { getPublishedAssessmentBySlug } from "@/lib/db/assessments";
import { createAttempt } from "@/lib/db/attempts";
import {
  checkRateLimit,
  clientIpFrom,
  hashIp,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({
  assessmentSlug: z.string().min(1).max(100),
});

/** Start an attempt. Works fully logged out (§8) — anon_id cookie is the key. */
export async function POST(request: Request) {
  if (!(await checkRateLimit(request, RATE_LIMITS.attemptCreate))) {
    return rateLimitedResponse();
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const assessment = await getPublishedAssessmentBySlug(
    parsed.data.assessmentSlug,
  ).catch(() => null);
  if (!assessment) {
    return Response.json({ error: "Test not found." }, { status: 404 });
  }

  try {
    const anonId = await getOrSetAnonId();
    const user = await getSessionUser();
    const attemptId = await createAttempt({
      assessment_id: assessment.id,
      anon_id: anonId,
      user_id: user?.uid ?? null,
      ip_hash: hashIp(clientIpFrom(request)),
    });
    return Response.json({ attemptId });
  } catch (e) {
    console.error("attempt create failed", e);
    return Response.json(
      { error: "Could not start the test. Try again." },
      { status: 500 },
    );
  }
}
