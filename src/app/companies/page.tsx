import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For companies",
  description:
    "How GN Academy verification works for hiring teams: what a credential proves, what it doesn't, and how to check one.",
  alternates: { canonical: "/companies" },
};

export default function CompaniesPage() {
  return (
    <PageShell title="For companies">
      <p>
        Hiring for AI-assisted work is hard because the claim is free to make.
        &ldquo;Proficient with AI tools&rdquo; costs one line on a CV and tells
        you nothing. Our job is to turn that line into something you can check.
      </p>

      <h2 className="font-display text-lg font-semibold text-foreground">
        What a credential proves
      </h2>
      <p>
        That the holder passed a scored assessment built around real work
        scenarios, not definitions, at or above the certification&apos;s pass
        mark. Each credential carries a per-competency breakdown — prompting
        and output quality, tool fluency, workflow integration, and judgment
        and verification — so two people who both passed are still
        distinguishable.
      </p>

      <h2 className="font-display text-lg font-semibold text-foreground">
        What it doesn&apos;t prove
      </h2>
      <p>
        It isn&apos;t a reference and it isn&apos;t a work history. It says
        what someone could do under assessment on a given date. Interview them
        anyway — but you can skip the part where you try to work out whether
        the AI line on their CV means anything.
      </p>

      <h2 className="font-display text-lg font-semibold text-foreground">
        How to check one
      </h2>
      <p>
        Ask for the credential code — it looks like{" "}
        <span className="font-mono text-foreground">CAVA-2026-000001</span> —
        and enter it on the verification page. No account, no waiting on us.
        Revoked credentials still resolve and say so, along with the reason;
        nothing quietly disappears.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild>
          <Link href="/employers">Browse verified talent</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/verify">Verify a credential</Link>
        </Button>
      </div>

      <h2 className="font-display text-lg font-semibold text-foreground">
        Cost
      </h2>
      <p>
        Nothing. Verification is public and the directory is free to browse.
        We charge the people we certify, not the people who hire them — a
        placement fee would give us a reason to push candidates rather than to
        assess them honestly.
      </p>
    </PageShell>
  );
}
