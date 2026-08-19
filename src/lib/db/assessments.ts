import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ScorableQuestion } from "@/lib/assessment/scoring";

export type Assessment = {
  id: string;
  slug: string;
  title: string;
  type: "knowledge" | "practical" | "simulation" | "diagnostic";
  question_count: number | null;
  is_published: boolean;
};

/** Question as served to the browser — no correct answer, no explanation. */
export type PublicQuestion = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  sort_order: number;
};

export async function getPublishedAssessmentBySlug(
  slug: string,
): Promise<Assessment | null> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select("id, slug, title, type, question_count, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPublicQuestions(
  assessmentId: string,
): Promise<PublicQuestion[]> {
  const { data, error } = await supabaseAdmin()
    .from("questions")
    .select("id, prompt, options, sort_order")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/** Full rows including answers — server-side scoring only. Never serialise to the client. */
export async function getScorableQuestions(
  assessmentId: string,
): Promise<ScorableQuestion[]> {
  const { data, error } = await supabaseAdmin()
    .from("questions")
    .select("id, competency, correct_option_id, points")
    .eq("assessment_id", assessmentId);
  if (error) throw error;
  return data ?? [];
}

// ── Admin (service role; callers must have re-checked the admin claim) ──────

export type AdminAssessment = Assessment & {
  certification_id: string | null;
  passing_score: number | null;
  max_attempts: number;
};

export type AdminQuestion = {
  id: string;
  assessment_id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  competency: string;
  explanation: string | null;
  points: number;
  sort_order: number;
};

export async function listAllAssessments(): Promise<AdminAssessment[]> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select(
      "id, slug, title, type, question_count, is_published, certification_id, passing_score, max_attempts",
    )
    .order("slug");
  if (error) throw error;
  return data ?? [];
}

export async function getAssessmentById(
  id: string,
): Promise<AdminAssessment | null> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select(
      "id, slug, title, type, question_count, is_published, certification_id, passing_score, max_attempts",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Full rows including answers — admin editing only, never sent to a learner. */
export async function listQuestionsForAdmin(
  assessmentId: string,
): Promise<AdminQuestion[]> {
  const { data, error } = await supabaseAdmin()
    .from("questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export type QuestionInput = {
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  competency: string;
  explanation: string | null;
  points: number;
  sort_order: number;
};

export async function createQuestion(
  assessmentId: string,
  input: QuestionInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("questions")
    .insert({ assessment_id: assessmentId, ...input });
  if (error) throw error;
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("questions")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function countQuestions(assessmentId: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);
  if (error) throw error;
  return count ?? 0;
}

export async function updateAssessment(
  id: string,
  input: {
    title: string;
    passing_score: number | null;
    max_attempts: number;
    question_count: number | null;
    is_published: boolean;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("assessments")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}
