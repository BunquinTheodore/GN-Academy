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
    heading: "Anyone can say they know AI. Almost nobody can prove it.",
    subheading:
      "GN Academy turns AI skills into a credential employers can check in seconds: a code, a public page, no screenshots to fake. Built for Filipino students, VAs, freelancers and jobseekers.",
    primary: { label: "Create your free account", href: "/signup" },
    secondary: { label: "Already a member? Sign in", href: "/login" },
    note: "Free to join. Courses open once you are inside.",
    /**
     * The pills floating over the hero image. Every one of them is a fact
     * about how the product works, not a mood word. A page arguing that
     * unverifiable claims are worthless cannot decorate itself with
     * "Practical Learning".
     */
    pills: [
      "Checked in five seconds",
      "A public page, not a PDF",
      "Free to start",
    ],
  },

  /**
   * The catalogue, counted.
   *
   * These are real figures read from the database, and they are here instead
   * of the student counts and partner logos a template would put in this slot.
   * GN Academy has not run its first cohort, so there is no honest number of
   * learners to print, and printing a dishonest one on this page in particular
   * would refute the whole argument the page is making. Re-count before
   * editing: `npx tsx scripts/count-catalogue.ts`.
   */
  stats: {
    heading: "What is actually in there",
    items: [
      { value: "9", label: "Courses published" },
      { value: "89", label: "Lessons written" },
      { value: "278", label: "Assessment questions" },
      { value: "4", label: "Free from the start" },
    ],
    note: "Counted from the live catalogue, not rounded up.",
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
        // Do not name the four AI competencies here. The catalogue now spans
        // blockchain and finance, which are scored on their own, so listing
        // one course's competencies as though they were every course's makes
        // the page wrong the moment somebody earns a different credential.
        body: "Every credential shows how you scored on the skills that course assessed, not just whether you passed. Two people who both passed are still distinguishable.",
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

  /**
   * The subjects, as a grid.
   *
   * Nothing here is a link. The catalogue sits behind the login, and
   * `tests/e2e/public-pages.spec.ts` asserts this page never links into it:
   * listing a URL that answers with a redirect wastes the visitor's click and
   * the crawler's budget. The grid says what exists; the account is the door.
   *
   * `free` marks the subjects somebody can finish without paying, because that
   * is the single most useful thing a stranger reading this can learn.
   */
  tracks: {
    heading: "What we teach",
    body: "Nine certification tracks covering the work people are actually paid for. Four of them are free all the way to the credential. The full curriculum and pricing are inside your account.",
    items: [
      {
        icon: "foundations",
        title: "AI foundations",
        body: "What a language model is doing, why it is confidently wrong, and how to brief it so the answer is usable.",
        free: true,
      },
      {
        icon: "blockchain",
        title: "Blockchain basics",
        body: "How a chain works in plain language, what a wallet really holds, and how to recognise the scams built on top of it.",
        free: true,
      },
      {
        icon: "finance",
        title: "Personal finance",
        body: "What you earn after deductions, what interest costs you in both directions, and how the scams aimed at this audience are built.",
        free: true,
      },
      {
        icon: "assistance",
        title: "Virtual assistance",
        body: "Running client operations with AI in the loop, and knowing when not to trust what it hands you.",
        free: false,
      },
      {
        icon: "marketing",
        title: "Digital marketing",
        body: "Briefs, campaigns and copy with AI doing the drafting and you doing the deciding.",
        free: false,
      },
      {
        icon: "social",
        title: "Social media",
        body: "Planning, writing and scheduling a real account, with the parts AI is good at kept separate from the parts it is not.",
        free: false,
      },
      {
        icon: "prompting",
        title: "Prompt engineering",
        body: "Getting work out of Claude that you would otherwise have done by hand, and checking it before it goes anywhere.",
        free: false,
      },
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
