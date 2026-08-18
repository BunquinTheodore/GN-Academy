import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern your use of GN Academy.",
};

const sections = [
  {
    heading: "The service",
    body: "GN Academy provides online courses, assessments, and professional credentials, plus a talent directory that certified members can opt into. Accounts are personal and may not be shared or transferred.",
  },
  {
    heading: "Assessments and credentials",
    body: "Credentials are earned by passing assessments under your own name and your own work. Cheating, impersonation, or misrepresentation is grounds for revoking a credential; revoked credentials show as revoked on their public verification page. Credential codes and verification pages are public by design.",
  },
  {
    heading: "Payments",
    body: "Certification fees are shown in Philippine pesos before you enroll. Payments are currently confirmed manually against your payment reference. If a payment cannot be matched we will contact you before rejecting an enrollment.",
  },
  {
    heading: "Acceptable use",
    body: "Do not attempt to breach other users' data, scrape the platform, resell course content, or misrepresent an unverified score as a GN Academy credential.",
  },
  {
    heading: "Liability",
    body: "Courses and credentials are provided as-is. We do not guarantee employment outcomes, and we are not a party to any contract between you and an employer.",
  },
  {
    heading: "Changes",
    body: "We may update these terms; material changes will be announced by email to account holders before they take effect.",
  },
];

export default function TermsPage() {
  return (
    <PageShell title="Terms of service">
      <p className="rounded-md border border-verified/40 bg-verified/5 p-4 text-sm text-foreground">
        Draft — pending legal review. Last updated 18 August 2026.
      </p>
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-lg font-semibold text-foreground">{s.heading}</h2>
          <p className="mt-2">{s.body}</p>
        </section>
      ))}
    </PageShell>
  );
}
