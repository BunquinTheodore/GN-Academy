import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Free AI Readiness Test",
  description:
    "Fifteen scenario questions, ten minutes, a score out of 100. Find out how ready you are for AI-powered work.",
};

/**
 * Funnel entry (§10): stripped nav — logo only, no exits besides starting.
 * The quiz itself ships in Phase 2; this page is the stable URL and frame.
 */
export default function AiTestPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex justify-center px-4 py-6">
        <Link href="/" className="font-display text-lg font-semibold">
          {site.name}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-6 px-4 pb-24">
        <p className="font-mono text-xs tracking-wider text-primary uppercase">
          Free · 15 questions · about 10 minutes
        </p>
        <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
          How ready are you for AI-powered work?
        </h1>
        <p className="text-muted-foreground">
          Real work scenarios, not trivia: managing a client&apos;s inbox,
          scoping a project, checking AI output. You&apos;ll get a score out
          of 100 and the one skill area to fix first.
        </p>
        <Button asChild size="lg" className="h-12">
          <Link href="/ai-test/quiz">Start my test</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          No account needed. Your result is scored instantly.
        </p>
      </main>
    </div>
  );
}
