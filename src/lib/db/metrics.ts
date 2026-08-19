import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type FunnelCounts = {
  testsStarted: number;
  testsCompleted: number;
  emailsCaptured: number;
  freeEnrollments: number;
  paidEnrollments: number;
  paidConfirmed: number;
  credentialsIssued: number;
};

export type FunnelMetrics = {
  allTime: FunnelCounts;
  last30Days: FunnelCounts;
};

/** The diagnostic is the top of the funnel; exam attempts are not "tests". */
const AI_READINESS_SLUG = "ai-readiness";

async function countsFor(
  assessmentId: string | null,
  since?: string,
): Promise<FunnelCounts> {
  const admin = supabaseAdmin();

  const attempts = () => {
    let q = admin.from("attempts").select("id", { count: "exact", head: true });
    if (assessmentId) q = q.eq("assessment_id", assessmentId);
    if (since) q = q.gte("started_at", since);
    return q;
  };

  // !inner turns the embed into a join, so free/paid comes from the
  // certification itself rather than from a nullable amount column.
  const enrollments = (isFree: boolean) => {
    let q = admin
      .from("enrollments")
      .select("id, certifications!inner(is_free)", {
        count: "exact",
        head: true,
      })
      .eq("certifications.is_free", isFree);
    if (since) q = q.gte("enrolled_at", since);
    return q;
  };

  const [
    started,
    completed,
    emails,
    free,
    paid,
    paidConfirmed,
    credentials,
  ] = await Promise.all([
    attempts(),
    attempts().not("completed_at", "is", null),
    (() => {
      let q = admin.from("leads").select("id", { count: "exact", head: true });
      if (since) q = q.gte("created_at", since);
      return q;
    })(),
    enrollments(true),
    enrollments(false),
    enrollments(false).in("status", ["active", "completed"]),
    (() => {
      let q = admin
        .from("credentials")
        .select("id", { count: "exact", head: true })
        // Demo records have no account and are not achievements.
        .not("user_id", "is", null);
      if (since) q = q.gte("issued_at", since);
      return q;
    })(),
  ]);

  return {
    testsStarted: started.count ?? 0,
    testsCompleted: completed.count ?? 0,
    emailsCaptured: emails.count ?? 0,
    freeEnrollments: free.count ?? 0,
    paidEnrollments: paid.count ?? 0,
    paidConfirmed: paidConfirmed.count ?? 0,
    credentialsIssued: credentials.count ?? 0,
  };
}

/**
 * §13 funnel, computed from the database rather than from the analytics
 * provider. Server-side state changes an admin makes — a payment confirmed,
 * a credential issued — are invisible to a browser beacon, and these are the
 * numbers the business is actually run on.
 */
export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  const { data: assessment } = await supabaseAdmin()
    .from("assessments")
    .select("id")
    .eq("slug", AI_READINESS_SLUG)
    .maybeSingle();

  const assessmentId = assessment?.id ?? null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [allTime, last30Days] = await Promise.all([
    countsFor(assessmentId),
    countsFor(assessmentId, since),
  ]);

  return { allTime, last30Days };
}

/** Null when the denominator is zero — 0% would imply a real measurement. */
export function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}
