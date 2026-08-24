import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What GN Academy collects, why, how long we keep it, and your rights under the Data Privacy Act of 2012.",
};

const sections = [
  {
    heading: "What we collect",
    body: [
      "Account details: name and email address, plus a mobile number, profile photo, headline, skills, and portfolio items if you choose to add them.",
      "Assessment data: your answers, scores, and competency breakdowns from the AI Readiness Test and certification exams. If you take the test without an account, we store the attempt against an anonymous browser identifier, plus your email if you choose to give it.",
      "Payment references: for certification enrollments we store the payment method, reference number, and amount. We never see or store card numbers or wallet credentials.",
      "Technical data: we store a salted hash of your IP address for rate limiting and abuse prevention. We do not store raw IP addresses.",
    ],
  },
  {
    heading: "Why we collect it",
    body: [
      "To run your account, courses, and assessments; to issue and publicly verify credentials you earn; to respond to support and data requests; and to protect the platform from abuse.",
      "With your separate, optional consent: to send course updates and career tips by email. You can withdraw this at any time and it never affects your account.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Account and profile data: for as long as your account exists, then deleted on request or account deletion.",
      "Anonymous test attempts not linked to an account: up to 24 months, then deleted.",
      "Issued credentials: retained permanently as issued records, because employers rely on them. On account deletion they are unlinked from your personal data.",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "We set two cookies and neither one is for advertising. Both are first-party, both are read only by this site, and neither is shared with anyone.",
      "gn_session keeps you signed in. It holds a session token, not your password, it cannot be read by JavaScript, and it lasts five days. Using the site while signed in extends it, and signing out clears it immediately.",
      "gn_anon is an anonymous identifier that lets you take the free AI Readiness Test and see your own result without creating an account. It is a random value with nothing personal in it, it cannot be read by JavaScript, and it lasts one year. If you later create an account, the attempt it points at can be linked to you.",
      "We do not use advertising or third-party tracking cookies, which is why you are not asked to dismiss a cookie banner. Our analytics, when enabled, is a cookieless provider that counts page views without identifying you.",
      "Your browser also stores a few things on this device. Firebase, our sign-in provider, keeps your signed-in user record and a refresh token so you are not asked to log in on every visit; that one is exchanged with Google, because Google is what checks it. Alongside it we store two preferences of our own: the light or dark theme you picked, and when to next extend your session. Those two never leave your browser. Signing out clears the sign-in record, and clearing your site data removes all of it.",
    ],
  },
  {
    heading: "Who processes it",
    body: [
      "We use Google Firebase (authentication), Supabase (database and file storage, hosted in Singapore), Resend (transactional email), and our hosting provider. Each processes data only to provide its service to us.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Under the Data Privacy Act of 2012 (RA 10173) you may access, correct, or delete your personal data, object to processing, and withdraw consent. Use the form at /data-request or email gnclub.contactus@gmail.com. We respond within 15 working days.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "GN Academy · gnclub.contactus@gmail.com. If you believe your data privacy rights were violated, you may also complain to the National Privacy Commission (privacy.gov.ph).",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy">
      <p className="rounded-md border border-verified/40 bg-verified/5 p-4 text-sm text-foreground">
        Draft, pending legal review. Last updated 18 August 2026.
      </p>
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-lg font-semibold text-foreground">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p.slice(0, 40)} className="mt-2">
              {p}
            </p>
          ))}
        </section>
      ))}
    </PageShell>
  );
}
