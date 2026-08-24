import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "Why GN Academy exists and what a verified credential means.",
};

export default function AboutPage() {
  return (
    <PageShell title="About GN Academy">
      <p>
        GN Academy certifies AI-ready Filipino talent. We exist because
        &ldquo;knows how to use AI&rdquo; is on every CV and verifiable on
        almost none. Employers need proof, and talented people deserve a way
        to give it.
      </p>

      <h2 className="font-display text-lg font-semibold text-foreground">
        The network behind the credential
      </h2>
      <p>
        Learning here puts you inside a community, not just a course. GN
        Academy is powered by GN Ventures, which is a web3 community, and a
        community is a network of people who are hiring. Passing an assessment
        here does not just produce a certificate. It puts you in front of the
        companies and founders already inside that network.
      </p>

      <h2 className="font-display text-lg font-semibold text-foreground">
        Learn, prove, get hired
      </h2>
      <p>
        Three steps, and the third is the point. You learn a skill, you prove
        it under assessment, and the credential you earn carries a code any
        employer can check in seconds. From there your profile is visible to
        the people looking for exactly that skill.
      </p>
      <p>
        Every credential we issue has a public verification page. That is the
        whole model: no screenshots to fake, no claims to take on trust.
      </p>

    </PageShell>
  );
}
