import { z } from "zod";
import { canWriteAttempt } from "@/lib/assessment/ownership";
import { getAttemptById, saveAnswers } from "@/lib/db/attempts";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        optionId: z.string().min(1).max(10),
      }),
    )
    .max(50),
});

const paramsSchema = z.object({ attemptId: z.string().uuid() });

/** Persist in-progress answers so a refresh or crash loses nothing (§8). */
export async function PATCH(
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

  try {
    const attempt = await getAttemptById(params.data.attemptId);
    if (!attempt) {
      return Response.json({ error: "Attempt not found." }, { status: 404 });
    }
    if (!(await canWriteAttempt(attempt))) {
      return Response.json({ error: "Not your attempt." }, { status: 403 });
    }
    if (attempt.completed_at) {
      return Response.json(
        { error: "This attempt is already finished." },
        { status: 409 },
      );
    }
    await saveAnswers(attempt.id, parsed.data.answers);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("answer save failed", e);
    return Response.json(
      { error: "Could not save your answer. It's kept on this device too." },
      { status: 500 },
    );
  }
}
