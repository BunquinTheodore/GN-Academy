import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LEVELS, RESULTS_COPY, type LevelKey } from "@/content/ai-test";
import { getAttemptById, type Attempt } from "@/lib/db/attempts";
import { CredentialCard } from "@/components/credential-card";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { site } from "@/content/site";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ attemptId: z.string().uuid() });

async function loadCompletedAttempt(attemptId: string): Promise<Attempt> {
  const parsed = paramsSchema.safeParse({ attemptId });
  if (!parsed.success) notFound();
  const attempt = await getAttemptById(parsed.data.attemptId).catch(() => null);
  if (!attempt) notFound();
  if (!attempt.completed_at || attempt.score === null) redirect("/ai-test");
  return attempt;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}): Promise<Metadata> {
  const { attemptId } = await params;
  const parsed = paramsSchema.safeParse({ attemptId });
  if (!parsed.success) return { title: "Result not found" };
  const attempt = await getAttemptById(parsed.data.attemptId).catch(() => null);
  if (!attempt || attempt.score === null) return { title: "AI Readiness result" };
  return {
    title: `AI Readiness score: ${attempt.score}/100`,
    description:
      "I took the free AI Readiness Test at GN Academy: 15 real work scenarios, scored across four competencies.",
    robots: { index: false, follow: true },
  };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await loadCompletedAttempt(attemptId);

  const level = LEVELS[(attempt.level ?? "beginner") as LevelKey] ?? LEVELS.beginner;
  const competencies = attempt.competency_scores ?? [];
  const weakest =
    competencies.length > 0
      ? competencies.reduce((min, c) => (c.score < min.score ? c : min))
      : null;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex justify-center px-4 py-5">
        <Link href="/" className="font-display text-lg font-semibold">
          {site.name}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
        <section aria-labelledby="score-heading" className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-xs tracking-wider text-primary uppercase">
              AI Readiness Test result
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              <p id="score-heading" className="font-mono text-6xl font-semibold">
                {attempt.score}
              </p>
              <p className="font-mono text-xl text-muted-foreground">/100</p>
              <span className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
                {level.label}
              </span>
            </div>
          </div>

          <div>
            <h1 className="font-display text-xl font-semibold text-balance">
              {level.headline}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{level.message}</p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Competency breakdown</h2>
            {competencies.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono text-muted-foreground">
                    {c.score}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${c.label}: ${c.score} out of 100`}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {weakest && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {RESULTS_COPY.weakestIntro}
              </p>
              <p className="mt-1 font-medium">{weakest.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the area employers weight most heavily. Fixing it is
                the fastest way to move your score.
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 py-2">
            <CredentialCard
              state="locked"
              holderName="Your name here"
              title="Certified AI Virtual Assistant"
              level="Professional certification"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="h-12">
              <Link href={RESULTS_COPY.primaryCta.href}>
                {RESULTS_COPY.primaryCta.label}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12">
              <Link href={RESULTS_COPY.secondaryCta.href}>
                {RESULTS_COPY.secondaryCta.label}
              </Link>
            </Button>
            <ShareButton />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
