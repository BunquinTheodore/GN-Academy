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
    heading: "Learn the basics. Earn proof that your skills are real.",
    subheading:
      "Build practical foundations in AI, blockchain, online safety, personal finance, freelancing and more. Then earn a credential employers can verify in seconds.",
    primary: { label: "Take the free AI skills test", href: "/ai-test" },
    secondary: { label: "How certification works", href: "/faq" },
    note: "Free, short and built around real AI work scenarios.",
    /**
     * The pills floating over the hero image. Every one of them is a fact
     * about how the product works, not a mood word. A page arguing that
     * unverifiable claims are worthless cannot decorate itself with
     * "Practical Learning".
     */
    pills: [
      "Know where your skills stand",
      "Show employers real proof",
      "Start learning for free",
    ],
  },

  certificateReasons: {
    eyebrow: "Why earn a GN Academy certificate?",
    heading: "Knowledge gets you started. Proof helps you move forward.",
    body: "A certificate turns what you learned into evidence another person can check. That matters when you are applying for work, pitching a client or deciding what to learn next.",
    items: [
      {
        title: "Stand out from unsupported claims",
        body: "Give employers and clients a verified result instead of another skill listed without evidence.",
      },
      {
        title: "See your strengths and gaps",
        body: "Your assessment breakdown shows what you already understand and where focused practice will help most.",
      },
      {
        title: "Keep proof you can share",
        body: "Your credential code stays easy to verify from a CV, application, portfolio or client proposal.",
      },
    ],
    test: {
      eyebrow: "Already confident with AI?",
      heading: "Take a free, short skills check.",
      body: "Answer 15 practical scenarios in about 10 minutes and find out whether your AI knowledge holds up in real work situations.",
      cta: { label: "Check my AI readiness", href: "/ai-test" },
    },
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
      { value: "20", label: "Courses published" },
      { value: "212", label: "Lessons written" },
      { value: "651", label: "Assessment questions" },
      { value: "7", label: "Free from the start" },
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
    body: "Twenty certification tracks covering the work people are actually paid for. Seven of them are free all the way to the credential. The full curriculum and pricing are inside your account. The same foundations also travel offline, through talks and workshops bringing trading and tech education access to university campuses.",
    items: [
      {
        icon: "foundations",
        title: "AI foundations",
        body: "What a language model is doing, why it is confidently wrong, and how to brief it so the answer is usable.",
        free: true,
      },
      {
        icon: "safety",
        title: "Online safety",
        body: "The scams and account takeovers aimed at this audience, and the defences that actually stop them.",
        free: true,
      },
      {
        icon: "finance",
        title: "Personal finance",
        body: "What you earn after deductions, what interest costs you in both directions, and how a guaranteed return gives a scam away.",
        free: true,
      },
      {
        icon: "freelancing",
        title: "Freelancing",
        body: "Where the first client comes from, what to charge, what goes in the agreement, and what to do when scope creeps.",
        free: true,
      },
      {
        icon: "careers",
        title: "Careers and job hunting",
        body: "A resume that survives a skim, a portfolio that shows work rather than claims, and an application that is not everyone else's.",
        free: true,
      },
      {
        icon: "blockchain",
        title: "Blockchain basics",
        body: "How a chain works in plain language, what a wallet really holds, and how to recognise what is built on top of it.",
        free: true,
      },
      {
        icon: "assistance",
        title: "Virtual assistance and support",
        body: "Running client operations and a support queue with AI drafting and you deciding what actually goes out.",
        free: false,
      },
      {
        icon: "communication",
        title: "Client communication",
        body: "Writing to clients in English so you sound competent rather than apologetic, including saying no and delivering bad news early.",
        free: false,
      },
      {
        icon: "marketing",
        title: "Marketing and social",
        body: "Briefs, campaigns, copy and a real posting schedule, with AI doing the drafting and you doing the judging.",
        free: false,
      },
      {
        icon: "design",
        title: "Design and video",
        body: "Visual work that looks deliberate, and short vertical video that holds attention past the first two seconds.",
        free: false,
      },
      {
        icon: "commerce",
        title: "Online selling",
        body: "Listings and photos that convert, pricing that survives fees and shipping, and handling orders without dropping any.",
        free: false,
      },
      {
        icon: "admin",
        title: "Books and spreadsheets",
        body: "Records you can stand behind, what registering as self-employed means, and a sheet that does the work instead of you.",
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
