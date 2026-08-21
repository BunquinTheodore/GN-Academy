import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, MapPin } from "lucide-react";
import { getPublicTalentByUsername } from "@/lib/db/talent";
import { PORTFOLIO_BUCKET, publicStorageUrl } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const talent = await getPublicTalentByUsername(username).catch(() => null);
  if (!talent) return { title: "Profile not found", robots: { index: false } };

  const name = talent.profile.full_name ?? talent.profile.username ?? "Talent";
  return {
    title: name,
    description:
      talent.profile.headline ??
      `${name} holds a verified GN Academy credential.`,
    alternates: { canonical: `/talent/${talent.profile.username}` },
  };
}

export default async function TalentProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const talent = await getPublicTalentByUsername(username).catch(() => null);
  // A private profile and a nonexistent one look identical from outside —
  // turning listing off must not confirm that the account exists.
  if (!talent) notFound();

  const { profile, credentials, portfolio } = talent;
  const name = profile.full_name ?? profile.username ?? "GN Academy member";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description: profile.headline ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: profile.location },
    knowsAbout: profile.skills,
    hasCredential: credentials.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.title,
      identifier: c.credential_code,
      url: `${env.NEXT_PUBLIC_SITE_URL}/verify/${c.credential_code}`,
      recognizedBy: {
        "@type": "Organization",
        name: site.name,
        url: env.NEXT_PUBLIC_SITE_URL,
      },
    })),
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="flex flex-wrap items-start gap-5">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="size-20 rounded-full border border-border object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold text-balance">
              {name}
            </h1>
            {profile.headline && (
              <p className="mt-1 text-lg text-muted-foreground">
                {profile.headline}
              </p>
            )}
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {profile.location}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <BadgeCheck className="size-5 text-verified-text" aria-hidden />
            Verified credentials
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {credentials.map((c) => (
              <li key={c.credential_code}>
                <Link
                  href={`/verify/${c.credential_code}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.credential_code} · issued {formatDate(c.issued_at)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    Verify
                    <ExternalLink className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Every code above resolves to a public record you can check without
            an account. Nothing on this page is self-reported.
          </p>
        </section>

        {profile.bio && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </section>
        )}

        {profile.skills.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">Skills</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li key={skill}>
                  <Badge variant="secondary">{skill}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        {portfolio.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">Work</h2>
            <div className="mt-3 flex flex-col gap-4">
              {portfolio.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  {item.image_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicStorageUrl(PORTFOLIO_BUCKET, item.image_path)}
                      alt=""
                      className="w-full border-b border-border object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="font-medium">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View project
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Hiring for this kind of work?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send an enquiry and we&apos;ll pass it on. No account, no fee.
          </p>
          <Button asChild className="mt-4">
            <Link
              href={`/employers/enquire?talent=${encodeURIComponent(profile.username ?? "")}`}
            >
              Contact {name.split(" ")[0]}
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
