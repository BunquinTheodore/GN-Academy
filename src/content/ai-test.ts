/**
 * AI Readiness Test configuration (§8). Weights and band copy are content —
 * editable here without touching the engine.
 */

export const COMPETENCIES = {
  prompting: {
    label: "Prompting & output quality",
    weight: 25,
    measures: "Getting usable work out, not just conversation",
  },
  tools: {
    label: "Tool fluency",
    weight: 20,
    measures: "Right tool for the job",
  },
  workflow: {
    label: "Workflow integration",
    weight: 35,
    measures: "Building AI into how you actually work",
  },
  judgment: {
    label: "Judgment & verification",
    weight: 20,
    measures: "Catching confident wrongness",
  },
} as const;

export type CompetencyKey = keyof typeof COMPETENCIES;

export const LEVELS = {
  beginner: {
    label: "Beginner",
    range: [0, 39],
    headline: "You're at the starting line — and that's fine.",
    message:
      "Most people here have barely used AI for real work yet. The free AI Foundations course covers everything on this test from zero, at your pace.",
    recommendedPath: "free-foundations",
  },
  developing: {
    label: "Developing",
    range: [40, 69],
    headline: "You're ahead of most people — but not yet job-ready.",
    message:
      "You use AI, and it shows. But daily chatting isn't the same as workflow competence, and this score wouldn't pass a practical assessment yet. The gap is closeable — it's specific skills, not talent.",
    recommendedPath: "free-foundations",
  },
  jobReady: {
    label: "Job-Ready",
    range: [70, 84],
    headline: "Strong. Now make it count.",
    message:
      "You work the way employers need. The problem is that this score is invisible — anyone can claim it. Certification turns what you just proved into something an employer can verify.",
    recommendedPath: "certified-ai-va",
  },
  advanced: {
    label: "Advanced",
    range: [85, 100],
    headline: "You're operating above most working professionals.",
    message:
      "Skip the foundations — they'd bore you. Go straight to a professional certification and get the credential that matches the skills you already have.",
    recommendedPath: "certified-ai-va",
  },
} as const;

export type LevelKey = keyof typeof LEVELS;

export const RESULTS_COPY = {
  weakestIntro: "Your weakest area",
  lockedCard: "Your score is unverified — employers can't see it.",
  primaryCta: { label: "Start the free certificate course", href: "/start-free" },
  secondaryCta: { label: "View the paid certification", href: "/certifications" },
} as const;
