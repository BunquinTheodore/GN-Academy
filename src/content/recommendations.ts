/**
 * Certification recommendation for the AI Readiness Test results page. Score
 * level decides which certification to push; the "intent" answer (a
 * non-scored question — see supabase/migrations/0011) flavors the pitch.
 */
import type { LevelKey } from "./ai-test";

// Fixed id from supabase/migrations/0011_ai_test_intent_question.sql.
export const INTENT_QUESTION_ID = "a0000000-0000-4000-8000-000000000050";

export type IntentOptionId = "remote" | "freelance" | "exploring";

export type Recommendation = {
  certification: { slug: string; title: string };
  headline: string;
  pitch: string;
  cta: { label: string; href: string };
  tone: "standard" | "urgent";
};

const FOUNDATIONS = {
  slug: "ai-foundations",
  title: "AI Foundations Certificate",
} as const;

const CAVA = {
  slug: "certified-ai-virtual-assistant",
  title: "Certified AI Virtual Assistant",
} as const;

function pitchFor(
  intentOptionId: string | undefined,
  copy: { remote: string; freelance: string; exploring: string },
): string {
  if (intentOptionId === "remote") return copy.remote;
  if (intentOptionId === "freelance") return copy.freelance;
  return copy.exploring;
}

export function getRecommendation(
  level: LevelKey,
  intentOptionId: string | undefined,
): Recommendation {
  const isTopTier = level === "jobReady" || level === "advanced";

  if (!isTopTier) {
    return {
      certification: FOUNDATIONS,
      headline: "Start here, free",
      pitch: pitchFor(intentOptionId, {
        remote: "Build the fundamentals remote employers actually check for, at your own pace, for free.",
        freelance: "Get the fundamentals clients expect before you start pitching for work, for free.",
        exploring: "No pressure, no cost: a low-stakes way to find out if this is for you.",
      }),
      cta: { label: "Start the free course", href: `/signup?next=%2Fcertifications%2F${FOUNDATIONS.slug}` },
      tone: "standard",
    };
  }

  return {
    certification: CAVA,
    headline: level === "advanced" ? "You're ready now" : "Make it official",
    pitch: pitchFor(intentOptionId, {
      remote: "Remote employers want proof, not a claim. This is the credential that gives it to them.",
      freelance: "Clients pay more for a verifiable credential than for a promise. This is that credential.",
      exploring: "Whatever direction you take next, this is the credential that keeps every door open.",
    }),
    cta: { label: "Get certified", href: `/signup?next=%2Fcertifications%2F${CAVA.slug}` },
    tone: level === "advanced" ? "urgent" : "standard",
  };
}
