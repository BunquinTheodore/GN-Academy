/**
 * Advocacy content: the Proof of Work gallery and the Speaker Booking page.
 *
 * Follows the pattern of `src/content/landing.ts` — copy lives here, typed,
 * as data a non-developer can edit. The gallery below only lists real,
 * supplied photos (see `gallery.photos`) — no per-event names, cities or
 * dates are claimed, since none have been confirmed by Jops. Nothing in this
 * file invents a school name, an event date or a statistic.
 */

/** One real photo in the campus/event gallery marquee. */
export type ProofOfWorkPhoto = {
  /** Filename under `/public/proof-of-work/campus/`. */
  file: string;
  /** Honest, brief description of what is visible in the photo. */
  alt: string;
};

export const advocacy = {
  /**
   * Light copy blocks weaving advocacy language into the site without
   * touching the AI Readiness Test / certification hero content.
   */
  intro: {
    eyebrow: "Beyond the platform",
    heading: "Bringing trading and tech education to more campuses",
    body: "Outside the courses on this site, the GN Ventures team runs talks, workshops and hackathon sessions that bring practical trading and technology education directly to university students. Below are real photos from the talks, panels and expo stops the team has shown up for, proof of that work as it happens.",
  },

  gallery: {
    photos: [
      {
        file: "IMAGE0054-00624.jpg",
        alt: "A speaker in a light jacket smiling and pointing his microphone toward the audience on a blue-lit stage.",
      },
      {
        file: "IMAGE0055-00628.jpg",
        alt: "Two speakers sharing microphones and laughing together on stage in front of a large screen.",
      },
      {
        file: "IMAGE0086-00756.jpg",
        alt: "A speaker in a jacket holding a phone and speaking into a microphone on stage, with a certificate of appreciation displayed beside him.",
      },
      {
        file: "IMAGE0087-00759.jpg",
        alt: "A panel of four people seated together on stage, with one panelist speaking into a microphone.",
      },
      {
        file: "IMAGE0088-00761.jpg",
        alt: "A panelist wearing glasses and a fleece jacket, speaking into a microphone from a couch during a panel discussion.",
      },
      {
        file: "IMAGE0089-00763.jpg",
        alt: "A panelist in a denim jacket wearing a name badge, speaking into a microphone on a couch during a panel discussion.",
      },
      {
        file: "IMAGE0117-00842.jpg",
        alt: "Two speakers standing close together sharing microphones on an expo stage backdrop reading \"World of Innovation\".",
      },
      {
        file: "IMAGE0149-00951.jpg",
        alt: "A speaker presenting beside a bright yellow slide about a company's solutions during an expo talk.",
      },
      {
        file: "IMAGE0163-01012.jpg",
        alt: "A speaker at a podium gesturing while presenting a slide about a decentralized data platform at an expo.",
      },
      {
        file: "IMAGE0167-01022.jpg",
        alt: "A speaker at a podium smiling while speaking into a microphone under purple stage lighting.",
      },
      {
        file: "IMAGE0218-01240.jpg",
        alt: "A speaker wearing a cap and a jacket with an ocean-themed logo, speaking into a microphone on an expo stage.",
      },
    ] satisfies ProofOfWorkPhoto[],
  },

  speakerBooking: {
    eyebrow: "Book a speaker",
    heading: "Bring GN Ventures to your campus or event",
    body: "Jops speaks with university students and communities about practical trading and technology skills, the same foundations taught in GN Academy's free tracks. Tell us about your event and we will follow up by email.",
    imagery: [
      { file: "speaker-jops-01.jpg", alt: "Jops speaking into a microphone during a presentation, gesturing while addressing the audience." },
      { file: "speaker-jops-02.jpg", alt: "Jops speaking at a Web3 community event, holding a microphone in front of a branded stage backdrop." },
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
