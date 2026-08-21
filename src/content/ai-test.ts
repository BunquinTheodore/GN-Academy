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
    headline: "You're at the starting line, and that's fine.",
    message:
      "Most people here have barely used AI for real work yet. The free AI Foundations course covers everything on this test from zero, at your pace.",
    recommendedPath: "free-foundations",
  },
  developing: {
    label: "Developing",
    range: [40, 69],
    headline: "You're ahead of most people, but not yet job-ready.",
    message:
      "You use AI, and it shows. But daily chatting isn't the same as workflow competence, and this score wouldn't pass a practical assessment yet. The gap is closeable: it's specific skills, not talent.",
    recommendedPath: "free-foundations",
  },
  jobReady: {
    label: "Job-Ready",
    range: [70, 84],
    headline: "Strong. Now make it count.",
    message:
      "You work the way employers need. The problem is that this score is invisible. Anyone can claim it. Certification turns what you just proved into something an employer can verify.",
    recommendedPath: "certified-ai-va",
  },
  advanced: {
    label: "Advanced",
    range: [85, 100],
    headline: "You're operating above most working professionals.",
    message:
      "Skip the foundations. They'd bore you. Go straight to a professional certification and get the credential that matches the skills you already have.",
    recommendedPath: "certified-ai-va",
  },
} as const;

export type LevelKey = keyof typeof LEVELS;

export const RESULTS_COPY = {
  weakestIntro: "Your weakest area",
  // The locked-score line is not here: it lives in CredentialCard, which
  // renders it on the dashboard too and has to say the same thing in both
  // places. A key here that nothing rendered was worse than no key, because
  // this file is edited by whoever owns the copy.
  // Both destinations are behind the login now, and whoever reads this page
  // is usually still anonymous: the results page is the end of the free
  // funnel. Sending them to /signup with a `next` is the difference between
  // "create your account, then you are in the course" and an unexplained
  // sign-in wall, which is where the funnel used to lose them.
  primaryCta: {
    label: "Start the free certificate course",
    href: "/signup?next=%2Fstart-free",
  },
  secondaryCta: {
    label: "See the paid certification",
    href: "/signup?next=%2Fcertifications",
  },
} as const;
