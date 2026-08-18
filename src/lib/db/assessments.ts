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
