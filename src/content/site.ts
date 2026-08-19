/**
 * §5: content is data. Static marketing copy lives here, typed — never
 * hardcoded in JSX. A non-developer edits this file (or later, /admin).
 */

export const site = {
  name: "GN Academy",
  tagline: "Learn. Prove. Get hired.",
  description:
    "Professional AI certification for Filipinos. Take the free AI Readiness Test, earn a verified credential, and get found by employers.",
} as const;

export const nav = {
  links: [
    { label: "Certifications", href: "/certifications" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Verify a credential", href: "/verify" },
  ],
  // §10: low-commitment ask converts better than "Get certified".
  cta: { label: "Take the free test", href: "/ai-test" },
} as const;

export const home = {
  hero: {
    kicker: "Free AI Readiness Test · 10 minutes",
    heading: "Find out if you're ready for the AI-powered workplace",
    subheading:
      "Fifteen scenario questions, a score out of 100, and the exact skills to work on next. Built for Filipino students, VAs, freelancers, and jobseekers.",
    primaryCta: { label: "Take the free test", href: "/ai-test" },
    secondaryCta: { label: "How it works", href: "/how-it-works" },
  },
  ladder: {
    heading: "Score it. Prove it. Get hired for it.",
    steps: [
      {
        title: "Learn",
        body: "Start free with AI Foundations, or go straight to a professional certification track.",
      },
      {
        title: "Prove",
        body: "Pass a practical assessment — not a multiple-choice memory quiz — and earn a credential.",
      },
      {
        title: "Get hired",
        body: "Every credential has a public verification page employers can check in seconds.",
      },
    ],
  },
  verification: {
    heading: "A score means nothing until it's verified",
    body: "Anyone can claim AI skills. A GN Academy credential carries a code any employer can check — no login, no screenshots to fake.",
    cta: { label: "See how verification works", href: "/verify" },
  },
} as const;

export const footer = {
  blurb:
    "GN Academy certifies AI-ready Filipino talent and connects them with employers who need proof, not promises.",
  columns: [
    {
      heading: "Platform",
      links: [
        { label: "AI Readiness Test", href: "/ai-test" },
        { label: "Certifications", href: "/certifications" },
        { label: "Verify a credential", href: "/verify" },
        { label: "How it works", href: "/how-it-works" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "For employers", href: "/employers" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy policy", href: "/privacy" },
        { label: "Terms of service", href: "/terms" },
        { label: "Data requests", href: "/data-request" },
      ],
    },
  ],
  // TODO(blocked): sibling-of-MAZAL vs parent-brand wording — business
  // decision, see BLOCKED.md before editing the About page.
  legalLine: `© ${new Date().getFullYear()} GN Academy. All rights reserved.`,
} as const;
