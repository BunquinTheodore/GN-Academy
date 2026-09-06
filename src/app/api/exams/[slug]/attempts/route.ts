import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getEnrollment } from "@/lib/db/enrollments";
import {
  countCompletedAttempts,
  getPublishedExamBySlug,
} from "@/lib/db/exams";
import { createAttempt } from "@/lib/db/attempts";
import { getFinalExamGate } from "@/lib/assessment/exam-gate";
import { clientIpFrom, hashIp } from "@/lib/rate-limit";
import { isTrustedOrigin, untrustedOriginResponse } from "@/lib/origin-check";
import { site } from "@/content/site";

const paramsSchema = z.object({ slug: z.string().min(1).max(100) });

/**
 * Start an exam attempt: requires an active enrollment, attempts left, and on a
 * course that has chapter quizzes, the course actually finished.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!isTrustedOrigin(request)) return untrustedOriginResponse();
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

      // On a course with chapter quizzes the exam is the end of the course, not
      // a shortcut through it. Three attempts is the whole allowance, so a
      // learner who jumps straight here burns one of them on material they have
      // not read. Chapter quizzes are exempt (module_id set): they are what the
      // gate asks for, so gating them would lock the course from the inside.
      if (exam.module_id === null) {
        const gate = await getFinalExamGate(user.uid, exam.certification_id);
        if (gate.reason) {
          return Response.json({ error: gate.reason }, { status: 403 });
        }
      }
    }

    const used = await countCompletedAttempts(user.uid, exam.id);
    if (used >= exam.max_attempts) {
      return Response.json(
        {
          error: `You've used all ${exam.max_attempts} attempts for this exam. Email ${site.contactEmail} if you believe this is wrong.`,
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
