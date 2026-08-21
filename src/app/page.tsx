import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, ShieldCheck } from "lucide-react";
import { landing } from "@/content/landing";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/credential-card";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import {
  AuroraBackdrop,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion/reveal";

/**
 * The public landing page.
 *
 * It sells; it does not shop. There is no course list, no price grid and no
 * "start learning" link, because the catalogue is behind the login — every
 * call to action here goes to sign-up or sign-in. Someone already signed in
 * is offered their dashboard instead, since sending them to a sales page for
 * something they have already bought into is just friction.
 */
export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <AuroraBackdrop />
          <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="max-w-xl">
                <Reveal>
                  <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs tracking-wider uppercase">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                    {landing.hero.kicker}
                  </p>
                </Reveal>

                <Reveal delay={0.06}>
                  <h1 className="font-display mt-5 text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                    {landing.hero.heading}
                  </h1>
                </Reveal>

                <Reveal delay={0.12}>
                  <p className="mt-5 text-base text-muted-foreground sm:text-lg">
                    {landing.hero.subheading}
                  </p>
                </Reveal>

                <Reveal delay={0.18}>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {user ? (
                      <Button asChild size="lg" className="h-12">
                        <Link href="/dashboard">
                          Go to my dashboard
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="lg" className="h-12">
                          <Link href={landing.hero.primary.href}>
                            {landing.hero.primary.label}
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="lg"
                          variant="outline"
                          className="h-12"
                        >
                          <Link href={landing.hero.secondary.href}>
                            {landing.hero.secondary.label}
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </Reveal>

                {!user && (
                  <Reveal delay={0.24}>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {landing.hero.note}
                    </p>
                  </Reveal>
                )}
              </div>

              <Reveal delay={0.2} y={24} className="hidden justify-center lg:flex">
                <CredentialCard
                  state="verified"
                  holderName="Juana D. (Demo credential)"
                  title="Certified AI Virtual Assistant"
                  level="Professional certification"
                  credentialCode="CAVA-2026-000001"
                  issuedAt={new Date("2026-08-01")}
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── The problem ──────────────────────────────────────────────── */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <Reveal>
              <h2 className="font-display max-w-2xl text-2xl font-semibold sm:text-3xl">
                {landing.problem.heading}
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                {landing.problem.body}
              </p>
            </Reveal>

            <Stagger className="mt-10 grid gap-6 sm:grid-cols-2" delay={0.1}>
              {landing.problem.points.map((point) => (
                <StaggerItem
                  key={point.title}
                  className="rounded-lg border border-border bg-background p-5"
                >
                  <h3 className="font-medium">{point.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {point.body}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── What you get ─────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              {landing.offer.heading}
            </h2>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 md:grid-cols-2" delay={0.05}>
            {landing.offer.items.map((item) => (
              <StaggerItem
                key={item.title}
                className="flex gap-4 rounded-lg border border-border p-5"
              >
                <BadgeCheck
                  className="size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                {landing.ladder.heading}
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid gap-8 sm:grid-cols-3" delay={0.05}>
              {landing.ladder.steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <p className="font-mono text-sm text-muted-foreground">
                    0{i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── What we teach (described, never listed) ──────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                {landing.tracks.heading}
              </h2>
              <p className="mt-4 text-muted-foreground">{landing.tracks.body}</p>
              {!user && (
                <Button asChild className="mt-6 h-11">
                  <Link href="/signup">
                    Create an account to see them
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              )}
            </Reveal>

            <Stagger className="flex flex-col gap-3" delay={0.05}>
              {landing.tracks.items.map((item) => (
                <StaggerItem
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-border p-4"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm">{item}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── Employers ────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <Reveal className="max-w-2xl">
              <ShieldCheck className="size-6 text-primary" aria-hidden />
              <h2 className="font-display mt-4 text-2xl font-semibold sm:text-3xl">
                {landing.employers.heading}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {landing.employers.body}
              </p>
              <Button asChild variant="outline" className="mt-6 h-11">
                <Link href={landing.employers.cta.href}>
                  {landing.employers.cta.label}
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 py-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Questions people actually ask
            </h2>
          </Reveal>

          <Stagger className="mt-8 flex flex-col gap-3" delay={0.05}>
            {landing.faq.map((item) => (
              <StaggerItem key={item.q}>
                <details className="group rounded-lg border border-border p-5">
                  <summary className="min-h-11 cursor-pointer list-none font-medium">
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
                </details>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
                {landing.finalCta.heading}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                {landing.finalCta.body}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {user ? (
                  <Button asChild size="lg" className="h-12">
                    <Link href="/dashboard">Go to my dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="h-12">
                      <Link href={landing.finalCta.primary.href}>
                        {landing.finalCta.primary.label}
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12">
                      <Link href={landing.finalCta.secondary.href}>
                        {landing.finalCta.secondary.label}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
