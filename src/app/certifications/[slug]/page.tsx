import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, Lock } from "lucide-react";
import {
  getModulesWithLessonMeta,
  getPublishedCertificationBySlug,
  listPublishedCertifications,
} from "@/lib/db/certifications";
import { formatPhp } from "@/lib/format";
import { env } from "@/lib/env";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/credential-card";

export const revalidate = 300;

/**
 * Prerender every published certification at build time. The catalogue is a
 * handful of rows, so this costs nothing and turns the product page from
 * "dynamic on first hit, then ISR" into a static file — no DB round trip in
 * the critical path for the page most visitors land on from search.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const certifications = await listPublishedCertifications().catch(() => []);
  return certifications.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cert = await getPublishedCertificationBySlug(slug).catch(() => null);
  if (!cert) return { title: "Certification not found" };
  return {
    title: cert.title,
    description: cert.summary ?? undefined,
    alternates: { canonical: `/certifications/${cert.slug}` },
  };
}

export default async function CertificationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cert = await getPublishedCertificationBySlug(slug).catch(() => null);
  if (!cert) notFound();

  const modules = await getModulesWithLessonMeta(cert.id).catch(() => []);
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
  const totalMinutes = modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
    0,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: cert.title,
    description: cert.summary,
    provider: {
      "@type": "Organization",
      name: "GN Academy",
      url: env.NEXT_PUBLIC_SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: cert.is_free ? 0 : (cert.price_php ?? 0),
      priceCurrency: "PHP",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: totalMinutes > 0 ? `PT${totalMinutes}M` : undefined,
    },
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {cert.level}
                </Badge>
                {cert.category && (
                  <Badge variant="outline">{cert.category}</Badge>
                )}
              </div>
              <h1 className="font-display mt-4 text-3xl font-semibold text-balance sm:text-4xl">
                {cert.title}
              </h1>
              {cert.subtitle && (
                <p className="mt-2 text-lg text-muted-foreground">
                  {cert.subtitle}
                </p>
              )}
              <p className="mt-4 text-muted-foreground">{cert.summary}</p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <p className="font-mono text-2xl font-semibold">
                  {cert.is_free
                    ? "Free"
                    : cert.price_php
                      ? formatPhp(cert.price_php)
                      : ""}
                </p>
                <Button asChild size="lg" className="h-12">
                  <Link href={`/certifications/${cert.slug}/enroll`}>
                    {cert.is_free ? "Start the free course" : "Enroll now"}
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {lessonCount} lessons
                {totalMinutes > 0 && <> · about {Math.round(totalMinutes / 60) || 1} h total</>}
                {" "}· pass mark {cert.passing_score}% · credential verifiable
                forever
              </p>
            </div>

            <div className="hidden lg:block">
              <CredentialCard
                state="goal"
                holderName="Your name here"
                title={cert.title}
                level={`${cert.level[0].toUpperCase()}${cert.level.slice(1)} certification`}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12">
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-10">
              {cert.description && (
                <div className="max-w-prose">
                  <h2 className="font-display text-xl font-semibold">
                    Why this certification
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    {cert.description}
                  </p>
                </div>
              )}

              <div>
                <h2 className="font-display text-xl font-semibold">
                  Curriculum
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {modules.map(({ module, lessons }, i) => (
                    <div
                      key={module.id}
                      className="rounded-lg border border-border bg-card p-5"
                    >
                      <p className="font-mono text-xs text-muted-foreground">
                        Module {i + 1}
                      </p>
                      <h3 className="mt-1 font-semibold">{module.title}</h3>
                      {module.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      )}
                      <ul className="mt-3 flex flex-col gap-2">
                        {lessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            {lesson.is_preview ? (
                              <BookOpen
                                className="size-4 shrink-0 text-primary"
                                aria-hidden
                              />
                            ) : (
                              <Lock
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                            <span>{lesson.title}</span>
                            {lesson.is_preview && (
                              <Badge variant="outline" className="ml-auto">
                                Free preview
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              {cert.outcomes.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold">
                    What you&apos;ll be able to do
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {cert.outcomes.map((outcome) => (
                      <li key={outcome} className="flex gap-2 text-sm">
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        <span className="text-muted-foreground">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cert.skills.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold">Skills certified</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cert.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">How you&apos;re assessed</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  A scored knowledge exam (pass mark {cert.passing_score}%, up
                  to 3 attempts). Pass it and your credential is issued with a
                  public verification page.
                </p>
                <Link
                  href="/verify"
                  className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  See how verification works
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
