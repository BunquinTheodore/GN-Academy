import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export const metadata: Metadata = {
  title: "Certifications",
  description:
    "Professional AI certifications for Filipino virtual assistants, freelancers, and jobseekers.",
};

export default function CertificationsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Certifications</h1>
        {/* Empty state as invitation (§5) — catalogue arrives with Phase 3 */}
        <div className="mt-10 flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
          <p className="max-w-prose text-muted-foreground">
            The certification catalogue opens soon, starting with Certified AI
            Virtual Assistant. Take the free AI Readiness Test now — your score
            tells you exactly which certification to start with.
          </p>
          <Button asChild>
            <Link href="/ai-test">Take the free test</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
