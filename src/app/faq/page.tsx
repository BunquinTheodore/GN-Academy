import type { Metadata } from "next";
import Link from "next/link";
import { landing } from "@/content/landing";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "How GN Academy works, from free AI Readiness Test to verified credential, plus answers to the questions people actually ask.",
  alternates: { canonical: "/faq" },
};

/**
 * "How it works" and the FAQ used to be two separate pages
 * (/how-it-works and /faq), each thin enough on its own that visiting one
 * meant a full page load for a handful of paragraphs. The homepage already
 * solved this for itself by putting the ladder and the accordion side by
 * side in one section (see the "How it works + Questions" section in
 * src/app/page.tsx) — this page is that same reasoning applied to the
 * dedicated, linkable, indexable version the nav points at. /how-it-works
 * now redirects here (see next.config.ts), so no old link dead-ends.
 *
 * Two glass panels side by side on desktop so the short content actually
 * uses the width instead of stacking into one narrow column; single column
 * on mobile, ladder first so the mechanism is read before the questions
 * about it.
 */
export default function FaqPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
            How it works, and what people ask about it
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The mechanism on the left, the questions it usually raises on the
            right. If yours is not here, email{" "}
            <a className="underline" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            . A person answers.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="glass-panel gn-shine overflow-hidden rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold sm:text-xl">
              {landing.ladder.heading}
            </h2>
            <ol className="mt-6 space-y-7">
              {landing.ladder.steps.map((step, i) => (
                <li key={step.title}>
                  <p className="font-mono text-sm text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-panel gn-shine overflow-hidden rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold sm:text-xl">
              Common questions
            </h2>
            <div className="mt-1">
              <FaqAccordion items={landing.faq} />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="h-11">
            <Link href="/signup">Create your free account</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/verify">See how verification works</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
