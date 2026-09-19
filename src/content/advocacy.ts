/**
 * Advocacy content: the Proof of Work gallery and the Speaker Booking page.
 *
 * Follows the pattern of `src/content/landing.ts` — copy lives here, typed,
 * as data a non-developer can edit. Nothing in this file invents a school
 * name, an event date or a statistic. Anything not yet confirmed by Jops is
 * marked `TODO` in the value itself, so it is impossible to ship a real-
 * looking placeholder by accident: a reviewer scanning the rendered page
 * sees "TODO" printed, not a plausible-looking fake.
 */

export type ProofOfWorkItem = {
  /** Stable key, used for the gallery grid and any future linking. */
  slug: string;
  kind: "university-talk" | "hackathon";
  /** School or event name. TODO until Jops confirms the real name. */
  name: string;
  /** Free-text location, or TODO. */
  location: string;
  /** ISO date if known, otherwise the literal string "TODO". */
  date: string;
  /** One or two sentences of factual description, no invented detail. */
  description: string;
  /** Published path(s) under /public/proof-of-work this item's photos use. */
  photos: string[];
};

export const advocacy = {
  /**
   * Light copy blocks weaving advocacy language into the site without
   * touching the AI Readiness Test / certification hero content.
   */
  intro: {
    eyebrow: "Beyond the platform",
    heading: "Bringing trading and tech education to more campuses",
    body: "Outside the courses on this site, the GN Ventures team runs talks, workshops and hackathon sessions that bring practical trading and technology education directly to university students. This gallery documents that work as it happens.",
  },

  gallery: {
    heading: "Proof of work",
    body: "A running record of campus talks and community events, each one labelled with what it was and when. Real names and dates go in as they are confirmed.",
    items: [
      {
        slug: "university-talk-01",
        kind: "university-talk",
        name: "TODO: school/university name",
        location: "TODO: city",
        date: "TODO",
        description:
          "Jops speaking with students about practical trading and technology skills. TODO: replace with a confirmed description once the event is on record.",
        photos: ["school-01.jpg", "school-02.jpg"],
      },
      {
        slug: "university-talk-02",
        kind: "university-talk",
        name: "TODO: school/university name",
        location: "TODO: city",
        date: "TODO",
        description: "TODO: confirm event description.",
        photos: ["school-03.jpg", "school-04.jpg"],
      },
      {
        slug: "university-talk-03",
        kind: "university-talk",
        name: "TODO: school/university name",
        location: "TODO: city",
        date: "TODO",
        description: "TODO: confirm event description.",
        photos: ["school-05.jpg", "school-06.jpg"],
      },
      {
        slug: "university-talk-04",
        kind: "university-talk",
        name: "TODO: school/university name",
        location: "TODO: city",
        date: "TODO",
        description: "TODO: confirm event description.",
        photos: ["school-07.jpg", "school-08.jpg"],
      },
      {
        slug: "university-talk-05",
        kind: "university-talk",
        name: "TODO: school/university name",
        location: "TODO: city",
        date: "TODO",
        description: "TODO: confirm event description.",
        photos: ["school-09.jpg", "school-10.jpg"],
      },
      {
        slug: "wobex-hackathon",
        kind: "hackathon",
        name: "Wobex Hackathon",
        location: "TODO: city / venue",
        date: "TODO",
        description:
          "GN Ventures' presence at the Wobex hackathon. TODO: confirm the exact event name, dates and a factual one-line recap once available.",
        photos: [
          "wobex-01.jpg",
          "wobex-02.jpg",
          "wobex-03.jpg",
          "wobex-04.jpg",
          "wobex-05.jpg",
        ],
      },
    ] satisfies ProofOfWorkItem[],
    note: "Real school and event names, and confirmed dates, are pending from Jops. Every TODO above is a placeholder, not a claim.",
  },

  /** The wide hero image above the gallery grid. */
  heroPhoto: {
    file: "school-hero.jpg",
    alt: "TODO: describe the photo once selected (Jops speaking at a university, wide shot).",
  },

  speakerBooking: {
    eyebrow: "Book a speaker",
    heading: "Bring GN Ventures to your campus or event",
    body: "Jops speaks with university students and communities about practical trading and technology skills, the same foundations taught in GN Academy's free tracks. Tell us about your event and we will follow up by email.",
    imagery: [
      { file: "speaker-jops-01.jpg", alt: "TODO: describe photo, Jops presenting on stage." },
      { file: "speaker-jops-02.jpg", alt: "TODO: describe photo, Jops engaging with the audience." },
    ],
    form: {
      heading: "Speaking inquiry",
      body: "Fields marked required help us reply with a useful answer on the first email.",
      fields: {
        name: { label: "Your name", placeholder: "Full name" },
        organization: { label: "Organization or school", placeholder: "University, club or company" },
        eventType: {
          label: "Event type",
          options: [
            "University talk",
            "Workshop",
            "Hackathon",
            "Panel",
            "Other",
          ],
        },
        date: { label: "Preferred date", placeholder: "" },
        audienceSize: { label: "Expected audience size", placeholder: "e.g. 50" },
        message: {
          label: "Tell us about the event",
          placeholder: "Audience, format, topics you'd like covered, anything else useful.",
        },
      },
      submit: "Send inquiry",
      success: "Thanks. Your inquiry is in, and we'll reply by email.",
      error: "Something went wrong sending that. Please try again or email us directly.",
    },
    directContact: {
      body: "Prefer email directly? Reach the team at",
    },
  },
} as const;
