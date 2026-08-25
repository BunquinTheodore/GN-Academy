import type { Metadata } from "next";
import Link from "next/link";
import { landing } from "@/content/landing";
import { site } from "@/content/site";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "Why courses sit behind an account, what is free, how payment works, and how long a certification takes.",
};

/**
 * The questions, moved off the landing page and given their own address.
 *
 * They were an accordion near the bottom of the home page, which is the worst
 * place for them: somebody with a question has to scroll past the whole pitch
 * to find it, and somebody reading the pitch has to scroll past six collapsed
 * questions to reach the call to action. On their own page they are linkable,
 * findable from the nav, and indexable, and the landing page gets shorter.
 *
 * The copy still lives in `src/content/landing.ts` so a non-developer edits one
 * file. It is shared, not duplicated.
 */
export default function FaqPage() {
  return (
    <PageShell title="Questions people actually ask">
      <p>
        If yours is not here, email{" "}
        <a className="underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
        . A person answers.
      </p>

      <dl className="mt-2 flex flex-col gap-4">
        {landing.faq.map((item) => (
          <div
            key={item.q}
            className="rounded-lg border border-border bg-card/70 p-5 backdrop-blur-sm"
          >
            <dt className="font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-2 text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild className="h-11">
          <Link href="/signup">Create your free account</Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/how-it-works">How it works</Link>
        </Button>
      </div>
    </PageShell>
  );
}
