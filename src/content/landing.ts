/**
 * The landing page is a sales page, not a shop front.
 *
 * The course catalogue lives behind the login, so nothing here links into it
 * and nothing here lists a course you could click. What it does instead is
 * describe the offer honestly enough that creating an account is an obvious
 * next step — the whole page argues one point, which is that a claim nobody
 * can check is worth nothing.
 *
 * Copy is data (§5). A non-developer edits this file.
 */

export const landing = {
  hero: {
    kicker: "Part of GN Ventures",
    heading: "Anyone can say they know AI. Almost nobody can prove it.",
    subheading:
      "GN Academy turns AI skills into a credential employers can check in seconds: a code, a public page, no screenshots to fake. Built for Filipino students, VAs, freelancers and jobseekers.",
    primary: { label: "Create your free account", href: "/signup" },
    secondary: { label: "Already a member? Sign in", href: "/login" },
    note: "Free to join. Courses open once you are inside.",
  },

  problem: {
    heading: "The line on your CV that means nothing",
    body: '"Proficient with AI tools" costs one line to write and takes an employer twenty minutes to test. So most of them never test it. They just discount it. That hurts the people who actually did the work.',
    points: [
      {
        title: "For you",
        body: "You learned the skill, and it looks identical on paper to someone who watched a video once.",
      },
      {
        title: "For employers",
        body: "Every shortlist has the same sentence on it, so the sentence stops carrying information.",
      },
    ],
  },

  offer: {
    heading: "What you actually get",
    items: [
      {
        title: "A credential with a public page",
        body: "Pass, and you get a code like CAVA-2026-000001. Anyone can open its verification page. No login, no waiting on us, no PDF to forge.",
      },
      {
        title: "A breakdown, not just a pass",
        body: "Every credential shows how you scored across prompting, tool fluency, workflow and judgment. Two people who both passed are still distinguishable.",
      },
      {
        title: "A profile employers browse",
        body: "Your credentials attach to a public profile in our talent directory. There is no unverified tier in it, which is the entire point.",
      },
      {
        title: "Work you can point at",
        body: "Add a portfolio of real pieces alongside the credential, so the proof and the evidence sit in one place.",
      },
    ],
  },

  ladder: {
    heading: "How it works",
    steps: [
      {
        title: "Learn",
        body: "Short, practical, text-only lessons written for real work. No videos to sit through, and readable on a phone during a commute.",
      },
      {
        title: "Prove",
        body: "A quiz after every chapter, then a final assignment a person actually reads and decides on. Not a multiple-choice memory test.",
      },
      {
        title: "Get hired",
        body: "Your credential goes public and your profile enters the employer directory, inside a web3 community already full of people hiring.",
      },
    ],
  },

  tracks: {
    heading: "What we teach",
    body: "Certification tracks covering the AI work people are actually paid for. The full catalogue, curriculum and pricing are inside your account.",
    items: [
      "Understanding AI properly, and using it as a working tool in any job",
      "AI-assisted virtual assistance and client operations",
      "AI-powered digital marketing",
      "Social media management with AI in the loop",
      "Prompt engineering with Claude, Claude Code and Cowork",
    ],
  },

  employers: {
    heading: "If you are hiring",
    body: "Ask for the code. Check it in five seconds. No account, no waiting on us. Every profile in our directory holds a credential you can verify yourself, and each one breaks down what the person is actually good at.",
    cta: { label: "See how verification works", href: "/verify" },
  },

  faq: [
    {
      q: "Why do I need an account to see the courses?",
      a: "Course material is the paid product, and the curriculum, pricing and assignments live inside it. Creating an account is free and takes about a minute, and you are not committing to anything by looking.",
    },
    {
      q: "Is anything free?",
      a: "Yes. The account is free, the AI Readiness Test is free, and there is a free certificate track. You only pay when you want a professional credential.",
    },
    {
      q: "How do I pay?",
      a: "GCash or Maya. You send the payment, enter the reference number, and we confirm it by hand, usually within 24 hours.",
    },
    {
      q: "Are there videos?",
      a: "No. Everything is written, which means it loads on any connection, costs almost nothing in mobile data, and you can re-read the one paragraph you needed instead of scrubbing a timeline.",
    },
    {
      q: "How long does a certification take?",
      a: "Self-paced. Most tracks are four chapters of three lessons, a quiz per chapter, and one final assignment. There is no deadline and no cohort to keep up with.",
    },
    {
      q: "What if I fail the assignment?",
      a: "You get written feedback saying what to change, and you resubmit. There is no limit on attempts and no extra charge.",
    },
  ],

  finalCta: {
    heading: "Turn the claim into something checkable",
    body: "Free account, free test, free starting course. The credential is the part worth paying for, and the part an employer can actually verify.",
    primary: { label: "Create your free account", href: "/signup" },
    secondary: { label: "Sign in", href: "/login" },
  },
} as const;
