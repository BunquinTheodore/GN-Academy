import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type Assignment = {
  id: string;
  certification_id: string;
  title: string;
  brief_mdx: string;
  criteria: string[];
  min_words: number;
  is_published: boolean;
};

export type SubmissionStatus =
  | "submitted"
  | "approved"
  | "changes_requested"
  | "rejected";

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string;
  link_url: string | null;
  status: SubmissionStatus;
  attempt_count: number;
  reviewer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
};

export async function getAssignmentForCertification(
  certificationId: string,
): Promise<Assignment | null> {
  const { data, error } = await supabaseAdmin()
    .from("assignments")
    .select("*")
    .eq("certification_id", certificationId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSubmission(
  assignmentId: string,
  userId: string,
): Promise<AssignmentSubmission | null> {
  const { data, error } = await supabaseAdmin()
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Submitting again after a revision request replaces the text and puts the
 * work back in the queue. attempt_count is bumped rather than a new row
 * written: the reviewer wants the current draft, not an archive, but how many
 * rounds it took is worth keeping.
 */
export async function upsertSubmission(input: {
  assignmentId: string;
  userId: string;
  content: string;
  linkUrl: string | null;
}): Promise<AssignmentSubmission> {
  const existing = await getSubmission(input.assignmentId, input.userId);

  const row = {
    assignment_id: input.assignmentId,
    user_id: input.userId,
    content: input.content,
    link_url: input.linkUrl,
    status: "submitted" as const,
    attempt_count: (existing?.attempt_count ?? 0) + 1,
    // The previous reviewer note is cleared: it belonged to the draft that has
    // just been replaced, and leaving it on screen reads as if it applies to
    // the new one.
    reviewer_note: null,
    reviewed_by: null,
    reviewed_at: null,
    submitted_at: new Date().toISOString(),
  };

  // The caller checks for an approved submission first, but between that read
  // and this write a reviewer can approve. Without the guard the approved row
  // would revert to "submitted", the reviewer's note would be erased, and the
  // work would rejoin the queue with a credential already issued against it.
  if (existing) {
    const { data, error } = await supabaseAdmin()
      .from("assignment_submissions")
      .update(row)
      .eq("assignment_id", input.assignmentId)
      .eq("user_id", input.userId)
      .neq("status", "approved")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("submission already approved");
    return data;
  }

  const { data, error } = await supabaseAdmin()
    .from("assignment_submissions")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export type SubmissionForReview = AssignmentSubmission & {
  assignments: {
    title: string;
    criteria: string[];
    certification_id: string;
    certifications: { title: string; slug: string } | null;
  } | null;
  profiles: { email: string; full_name: string | null } | null;
};

/** The admin queue. Oldest first — nobody should wait longer than anyone else. */
export async function listSubmissionsForReview(
  status: SubmissionStatus | "all" = "submitted",
): Promise<SubmissionForReview[]> {
  let query = supabaseAdmin()
    .from("assignment_submissions")
    .select(
      "*, assignments(title, criteria, certification_id, certifications(title, slug)), profiles(email, full_name)",
    )
    .order("submitted_at", { ascending: true });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SubmissionForReview[];
}

export async function getSubmissionById(
  id: string,
): Promise<SubmissionForReview | null> {
  const { data, error } = await supabaseAdmin()
    .from("assignment_submissions")
    .select(
      "*, assignments(title, criteria, certification_id, certifications(title, slug)), profiles(email, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as SubmissionForReview | null;
}

/**
 * Records a review decision. Scoped to a submission that is still awaiting
 * one, so two reviewers opening the same queue cannot both decide it.
 */
export async function recordReview(input: {
  submissionId: string;
  status: Exclude<SubmissionStatus, "submitted">;
  reviewerId: string;
  note: string | null;
}): Promise<SubmissionForReview | null> {
  const { data, error } = await supabaseAdmin()
    .from("assignment_submissions")
    .update({
      status: input.status,
      reviewer_note: input.note,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.submissionId)
    .eq("status", "submitted")
    .select(
      "*, assignments(title, criteria, certification_id, certifications(title, slug)), profiles(email, full_name)",
    )
    .maybeSingle();
  if (error) throw error;
  return data as unknown as SubmissionForReview | null;
}

export async function countPendingReviews(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("assignment_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if (error) throw error;
  return count ?? 0;
}
