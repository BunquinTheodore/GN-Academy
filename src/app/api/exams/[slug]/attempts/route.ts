import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getEnrollment } from "@/lib/db/enrollments";
import {
  countCompletedAttempts,
  getPublishedExamBySlug,
} from "@/lib/db/exams";
import { createAttempt } from "@/lib/db/attempts";
import { clientIpFrom, hashIp } from "@/lib/rate-limit";

const paramsSchema = z.object({ slug: z.string().min(1).max(100) });

/** Start an exam attempt: requires an active enrollment and attempts left. */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to take the exam." }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return Response.json({ error: "Invalid exam." }, { status: 400 });
  }

  try {
    const exam = await getPublishedExamBySlug(params.data.slug);
    if (!exam) {
      return Response.json({ error: "Exam not found." }, { status: 404 });
    }

    if (exam.certification_id) {
      const enrollment = await getEnrollment(user.uid, exam.certification_id);
      if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
        return Response.json(
          { error: "You need an active enrollment to take this exam." },
          { status: 403 },
        );
      }
    }

    const used = await countCompletedAttempts(user.uid, exam.id);
    if (used >= exam.max_attempts) {
      return Response.json(
        {
          error: `You've used all ${exam.max_attempts} attempts for this exam. Email us if you believe this is wrong.`,
        },
        { status: 403 },
      );
    }

    const attemptId = await createAttempt({
      assessment_id: exam.id,
      anon_id: "",
      user_id: user.uid,
      ip_hash: hashIp(clientIpFrom(request)),
    });

    return Response.json({
      attemptId,
      attemptsRemaining: exam.max_attempts - used,
    });
  } catch (e) {
    console.error("exam attempt create failed", e);
    return Response.json(
      { error: "Could not start the exam. Try again." },
      { status: 500 },
    );
  }
}
