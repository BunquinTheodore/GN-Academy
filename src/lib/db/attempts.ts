import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Answer, CompetencyResult } from "@/lib/assessment/scoring";

export type Attempt = {
  id: string;
  assessment_id: string;
  user_id: string | null;
  anon_id: string | null;
  email: string | null;
  score: number | null;
  competency_scores: CompetencyResult[] | null;
  level: string | null;
  recommended_path: string | null;
  passed: boolean | null;
  answers: Answer[];
  started_at: string;
  completed_at: string | null;
};

export async function createAttempt(input: {
  assessment_id: string;
  anon_id: string;
  user_id?: string | null;
  ip_hash: string;
}): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("attempts")
    .insert({
      assessment_id: input.assessment_id,
      anon_id: input.anon_id,
      user_id: input.user_id ?? null,
      ip_hash: input.ip_hash,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getAttemptById(id: string): Promise<Attempt | null> {
  const { data, error } = await supabaseAdmin()
    .from("attempts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAnswers(id: string, answers: Answer[]): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("attempts")
    .update({ answers })
    .eq("id", id)
    .is("completed_at", null);
  if (error) throw error;
}

export async function completeAttempt(
  id: string,
  input: {
    answers: Answer[];
    score: number;
    competency_scores: CompetencyResult[];
    level: string;
    recommended_path: string;
    email?: string | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("attempts")
    .update({
      answers: input.answers,
      score: input.score,
      competency_scores: input.competency_scores,
      level: input.level,
      recommended_path: input.recommended_path,
      email: input.email ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** On signup, claim any anonymous attempts made from this browser (§8). */
export async function linkAttemptsToUser(
  anonId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("attempts")
    .update({ user_id: userId })
    .eq("anon_id", anonId)
    .is("user_id", null);
  if (error) throw error;
}
