import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Assessment } from "@/lib/db/assessments";

export type Exam = Assessment & {
  certification_id: string | null;
  passing_score: number | null;
  max_attempts: number;
};

export async function getPublishedExamBySlug(slug: string): Promise<Exam | null> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select(
      "id, slug, title, type, question_count, is_published, certification_id, passing_score, max_attempts",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .neq("type", "diagnostic")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPublishedExams(): Promise<Exam[]> {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select(
      "id, slug, title, type, question_count, is_published, certification_id, passing_score, max_attempts",
    )
    .eq("is_published", true)
    .neq("type", "diagnostic");
  if (error) throw error;
  return data ?? [];
}

/** Completed attempts consume the allowance; abandoned ones don't. */
export async function countCompletedAttempts(
  userId: string,
  assessmentId: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .not("completed_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getBestAttempt(
  userId: string,
  assessmentId: string,
): Promise<{ score: number; passed: boolean } | null> {
  const { data, error } = await supabaseAdmin()
    .from("attempts")
    .select("score, passed")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .not("completed_at", "is", null)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as never;
}
