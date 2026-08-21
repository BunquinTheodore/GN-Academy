import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listPublishedCertifications } from "@/lib/db/certifications";
import { formatPhp } from "@/lib/format";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Certifications",
  description:
    "Professional AI certifications for Filipino virtual assistants, freelancers, and jobseekers. Every credential is publicly verifiable.",
};

// Was ISR-cached and public. The catalogue is now behind the login, so it is
// rendered per request for a known learner instead.
export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  foundation: "Foundation",
  professional: "Professional",
  advanced: "Advanced",
};

export default async function CertificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/certifications");

  let certifications = null;
  try {
    certifications = await listPublishedCertifications();
  } catch {
    // error state below
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Certifications
          </h1>
          <p className="mt-3 text-muted-foreground">
            Every certification ends in a scored exam and a credential with a
            public verification page. No participation certificates.
          </p>
        </div>

        {certifications === null ? (
          <div className="mt-10 rounded-lg border border-destructive/40 p-6">
            <p className="text-sm">
              The catalogue couldn&apos;t load. Refresh the page to try again.
            </p>
          </div>
        ) : certifications.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border p-8">
            <p className="text-muted-foreground">
              The first certification cohort opens soon. Take the free test
              now and we&apos;ll point you at the right track.
            </p>
            <Button asChild className="mt-4">
              <Link href="/ai-test">Take the free test</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {certifications.map((cert) => (
              <Link
                key={cert.id}
                href={`/certifications/${cert.slug}`}
                className="group flex flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="secondary">
                    {LEVEL_LABEL[cert.level] ?? cert.level}
                  </Badge>
                  <p className="font-mono text-sm">
                    {cert.is_free
                      ? "Free"
                      : cert.price_php
                        ? formatPhp(cert.price_php)
                        : ""}
                  </p>
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold group-hover:text-primary">
                    {cert.title}
                  </h2>
                  {cert.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cert.subtitle}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{cert.summary}</p>
                <p className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  View certification
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
