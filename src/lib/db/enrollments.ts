import "server-only";

import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/server";

export type EnrollmentStatus = "pending" | "active" | "completed" | "rejected";

export type Enrollment = {
  id: string;
  user_id: string;
  certification_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  payment_method: string | null;
  payment_ref: string | null;
  amount_paid_php: number | null;
  enrolled_at: string;
  approved_at: string | null;
  completed_at: string | null;
};

export async function getEnrollment(
  userId: string,
  certificationId: string,
): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin()
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("certification_id", certificationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Deduplicated per request with React's `cache`, for the same reason
 * `getSessionUser` is: the dashboard layout and the dashboard page both need
 * this, and every navigation inside the signed-in shell paid for it twice.
 */
export const listEnrollmentsForUser = cache(async function listEnrollmentsForUser(
  userId: string,
): Promise<Enrollment[]> {
  const { data, error } = await supabaseAdmin()
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
})

/**
 * Free certifications activate instantly; paid ones start pending (§17).
 *
 * Upsert, not insert: (user_id, certification_id) is unique, and the enroll
 * page deliberately lets someone through again after a rejection — a mistyped
 * payment reference has to be fixable. A plain insert made that second
 * attempt fail forever on a duplicate key, with a generic "try again" that
 * would never come true.
 */
export async function createEnrollment(input: {
  user_id: string;
  certification_id: string;
  is_free: boolean;
  payment_method?: string;
  payment_ref?: string;
  amount_paid_php?: number;
}): Promise<Enrollment> {
  const { data, error } = await supabaseAdmin()
    .from("enrollments")
    .upsert(
      {
        user_id: input.user_id,
        certification_id: input.certification_id,
        status: input.is_free ? "active" : "pending",
        approved_at: input.is_free ? new Date().toISOString() : null,
        enrolled_at: new Date().toISOString(),
        payment_method: input.payment_method ?? null,
        payment_ref: input.payment_ref ?? null,
        amount_paid_php: input.amount_paid_php ?? null,
      },
      { onConflict: "user_id,certification_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listPendingEnrollments(): Promise<
  (Enrollment & {
    profiles: { email: string; full_name: string | null } | null;
    certifications: { title: string; price_php: number | null } | null;
  })[]
> {
  const { data, error } = await supabaseAdmin()
    .from("enrollments")
    .select(
      "*, profiles ( email, full_name ), certifications ( title, price_php )",
    )
    .eq("status", "pending")
    .order("enrolled_at");
  if (error) throw error;
  return (data ?? []) as never;
}

/**
 * Returns the updated row (with the student and certification joined on) so
 * the caller can notify them, or null when the row was no longer pending —
 * the status guard is what makes a double-click idempotent.
 */
export async function setEnrollmentStatus(
  id: string,
  status: "active" | "rejected",
): Promise<
  | (Enrollment & {
      profiles: { email: string; full_name: string | null } | null;
      certifications: { title: string; slug: string } | null;
    })
  | null
> {
  const { data, error } = await supabaseAdmin()
    .from("enrollments")
    .update({
      status,
      approved_at: status === "active" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*, profiles ( email, full_name ), certifications ( title, slug )")
    .maybeSingle();
  if (error) throw error;
  return data as never;
}

export async function updateEnrollmentProgress(
  userId: string,
  certificationId: string,
  progressPercent: number,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("enrollments")
    .update({ progress_percent: progressPercent })
    .eq("user_id", userId)
    .eq("certification_id", certificationId);
  if (error) throw error;
}

export async function markEnrollmentCompleted(
  userId: string,
  certificationId: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("enrollments")
    .update({
      status: "completed",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("certification_id", certificationId);
  if (error) throw error;
}
