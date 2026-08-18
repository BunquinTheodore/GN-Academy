import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { home } from "@/content/site";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/credential-card";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <p className="font-mono text-xs tracking-wider text-primary uppercase">
                {home.hero.kicker}
              </p>
              <h1 className="font-display mt-4 text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                {home.hero.heading}
              </h1>
              <p className="mt-5 text-base text-muted-foreground sm:text-lg">
                {home.hero.subheading}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12">
                  <Link href={home.hero.primaryCta.href}>
                    {home.hero.primaryCta.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12">
                  <Link href={home.hero.secondaryCta.href}>
                    {home.hero.secondaryCta.label}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden justify-center lg:flex">
              <CredentialCard
                state="verified"
                holderName="Juana D. — Demo credential"
                title="Certified AI Virtual Assistant"
                level="Professional certification"
                credentialCode="CAVA-2026-000001"
                issuedAt={new Date("2026-08-01")}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              {home.ladder.heading}
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {home.ladder.steps.map((step, i) => (
                <div key={step.title}>
                  <p className="font-mono text-sm text-muted-foreground">
                    0{i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              {home.verification.heading}
            </h2>
            <p className="mt-4 text-muted-foreground">{home.verification.body}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={home.verification.cta.href}>
                {home.verification.cta.label}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
