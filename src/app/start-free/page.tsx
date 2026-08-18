import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Start free",
  description:
    "Begin with the free AI Foundations certificate course — no payment, no catch.",
};

export default function StartFreePage() {
  return (
    <PageShell title="Start free">
      <p>
        AI Foundations is a free certificate course covering the exact skills
        the AI Readiness Test measures — prompting, tools, workflow, and
        judgment — built for Filipino work contexts.
      </p>
      {/* TODO(phase-3): free course player + enrollment */}
      <div className="rounded-md border border-dashed border-border p-4">
        <p className="text-sm">
          The course opens with our certification launch. Create an account now
          and your test result carries over automatically.
        </p>
        <Button asChild className="mt-4">
          <Link href="/signup">Create my free account</Link>
        </Button>
      </div>
    </PageShell>
  );
}
