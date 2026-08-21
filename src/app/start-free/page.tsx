import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Start free",
  description:
    "Begin with the free AI Foundations certificate course. No payment, no catch.",
};

export default async function StartFreePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/start-free");

  return (
    <PageShell title="Start free">
      <p>
        AI Foundations is a free certificate course built for Filipino work
        contexts, covering the exact skills the AI Readiness Test measures:
        prompting, tools, workflow, and judgment.
      </p>
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-sm">
          Five short lessons, a free exam, and a verifiable certificate at the
          end. If you took the AI Readiness Test, your result carries over to
          your account automatically.
        </p>
        <Button asChild className="mt-4">
          <Link href="/certifications/ai-foundations">
            View the free course
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
