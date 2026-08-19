"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import { optional, optionalInt } from "@/lib/admin/form-values";
import { OPTION_IDS } from "@/lib/assessment/options";
import type { AdminFormState } from "@/components/admin/admin-form";
import {
  createQuestion,
  deleteQuestion,
  updateAssessment,
  updateQuestion,
  type QuestionInput,
} from "@/lib/db/assessments";

const questionSchema = z.object({
  assessmentId: z.string().uuid(),
  questionId: z.string().uuid().optional(),
  prompt: z.string().trim().min(10).max(2000),
  competency: z.string().trim().min(2).max(40),
  explanation: z.string().trim().max(2000).nullable(),
  points: z.number().int().min(1).max(10),
  sort_order: z.number().int().min(0).max(9999),
  correct_option_id: z.enum(OPTION_IDS),
});

export async function saveQuestionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = questionSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    questionId: optional(formData.get("questionId")) ?? undefined,
    prompt: formData.get("prompt"),
    competency: formData.get("competency"),
    explanation: optional(formData.get("explanation")),
    points: optionalInt(formData.get("points")) ?? 1,
    sort_order: optionalInt(formData.get("sort_order")) ?? 0,
    correct_option_id: formData.get("correct_option_id"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  // Options arrive as option_a … option_f; blank ones simply don't exist.
  const options = OPTION_IDS.map((id) => ({
    id,
    text: String(formData.get(`option_${id}`) ?? "").trim(),
  })).filter((o) => o.text.length > 0);

  if (options.length < 2) {
    return { error: "A question needs at least two answer options." };
  }
  if (!options.some((o) => o.id === parsed.data.correct_option_id)) {
    return {
      error: `Option ${parsed.data.correct_option_id.toUpperCase()} is marked correct but has no text.`,
    };
  }

  const { assessmentId, questionId, ...rest } = parsed.data;
  const input: QuestionInput = { ...rest, options };

  try {
    if (questionId) {
      await updateQuestion(questionId, input);
    } else {
      await createQuestion(assessmentId, input);
    }
    await auditLog({
      actorId: admin.uid,
      action: questionId ? "question.updated" : "question.created",
      entity: "question",
      entityId: questionId ?? null,
      // The prompt and correct answer stay out of the log — the audit trail
      // is readable by anyone with admin, and this is exam material.
      metadata: { assessment_id: assessmentId, competency: input.competency },
    });
    revalidatePath(`/admin/questions/${assessmentId}`);
    revalidatePath("/ai-test/quiz");
    return { ok: questionId ? "Question saved." : "Question added." };
  } catch (e) {
    console.error("save question failed", e);
    return { error: "Couldn't save the question." };
  }
}

export async function deleteQuestionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const questionId = z.string().uuid().safeParse(formData.get("questionId"));
  const assessmentId = z.string().uuid().safeParse(formData.get("assessmentId"));
  if (!questionId.success || !assessmentId.success) {
    return { error: "Invalid request." };
  }
  if (formData.get("confirm") !== "on") {
    return { error: "Tick the confirmation box to delete this question." };
  }

  try {
    await deleteQuestion(questionId.data);
    await auditLog({
      actorId: admin.uid,
      action: "question.deleted",
      entity: "question",
      entityId: questionId.data,
      metadata: { assessment_id: assessmentId.data },
    });
    revalidatePath(`/admin/questions/${assessmentId.data}`);
    revalidatePath("/ai-test/quiz");
    return { ok: "Question deleted." };
  } catch (e) {
    console.error("delete question failed", e);
    return { error: "Couldn't delete the question." };
  }
}

const assessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  passing_score: z.number().int().min(1).max(100).nullable(),
  max_attempts: z.number().int().min(1).max(1000),
  question_count: z.number().int().min(1).max(200).nullable(),
  is_published: z.boolean(),
});

export async function saveAssessmentAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = assessmentSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    title: formData.get("title"),
    passing_score: optionalInt(formData.get("passing_score")),
    max_attempts: optionalInt(formData.get("max_attempts")) ?? 3,
    question_count: optionalInt(formData.get("question_count")),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { assessmentId, ...rest } = parsed.data;

  try {
    await updateAssessment(assessmentId, rest);

    await auditLog({
      actorId: admin.uid,
      action: "assessment.updated",
      entity: "assessment",
      entityId: assessmentId,
      metadata: { is_published: rest.is_published },
    });
    revalidatePath(`/admin/questions/${assessmentId}`);
    revalidatePath("/ai-test/quiz");
    return { ok: "Saved." };
  } catch (e) {
    console.error("save assessment failed", e);
    return { error: "Couldn't save the assessment." };
  }
}
