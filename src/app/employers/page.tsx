import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { getTalentFacets, listPublicTalent } from "@/lib/db/talent";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For employers",
  description:
    "Hire Filipino talent with verified AI skills. Every profile here holds a credential you can check in seconds. No screenshots, no self-reported claims.",
  alternates: { canonical: "/employers" },
};

export const revalidate = 300;

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-primary/50"
      }
    >
      {label}
    </Link>
  );
}

export default async function EmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; certification?: string }>;
}) {
  const requested = await searchParams;

  const facets = await getTalentFacets().catch(
    (): { skills: string[]; certifications: string[] } => ({
      skills: [],
      certifications: [],
    }),
  );

  // Resolve filters against real facets so an invented query string shows the
  // full list rather than an empty one under a highlighted chip.
  const skill = requested.skill && facets.skills.includes(requested.skill)
    ? requested.skill
    : undefined;
  const certification =
    requested.certification &&
    facets.certifications.includes(requested.certification)
      ? requested.certification
      : undefined;

  const talent = await listPublicTalent({ skill, certification }).catch(
    () => null,
  );

  // null clears a filter, undefined keeps the current one.
  const query = (next: {
    skill?: string | null;
    certification?: string | null;
  }) => {
    const params = new URLSearchParams();
    const s = next.skill === undefined ? skill : next.skill;
    const c =
      next.certification === undefined ? certification : next.certification;
    if (s) params.set("skill", s);
    if (c) params.set("certification", c);
    const qs = params.toString();
    return qs ? `/employers?${qs}` : "/employers";
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Hire verified talent
          </h1>
          <p className="mt-3 text-muted-foreground">
            Everyone listed here passed a scored assessment and holds a
            credential with a public verification page. There is no unverified
            tier to filter out. That is the whole point.
          </p>
        </div>

        {(facets.skills.length > 0 || facets.certifications.length > 0) && (
          <div className="mt-8 flex flex-col gap-4">
            {facets.certifications.length > 0 && (
              <nav aria-label="Filter by certification">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Certification
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <FilterChip
                    href={query({ certification: null })}
                    label="Any"
                    active={!certification}
                  />
                  {facets.certifications.map((c) => (
                    <FilterChip
                      key={c}
                      href={query({ certification: c })}
                      label={c}
                      active={certification === c}
                    />
                  ))}
                </div>
              </nav>
            )}

            {facets.skills.length > 0 && (
              <nav aria-label="Filter by skill">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Skill
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <FilterChip
                    href={query({ skill: null })}
                    label="Any"
                    active={!skill}
                  />
                  {facets.skills.slice(0, 24).map((s) => (
                    <FilterChip
                      key={s}
                      href={query({ skill: s })}
                      label={s}
                      active={skill === s}
                    />
                  ))}
                </div>
              </nav>
            )}
          </div>
        )}

        {talent === null ? (
          <p className="mt-10 rounded-lg border border-destructive/40 p-6 text-sm">
            The directory couldn&apos;t load. Refresh to try again.
          </p>
        ) : talent.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border p-8">
            <p className="text-muted-foreground">
              {skill || certification
                ? "Nobody matches those filters yet."
                : "The directory opens with our first certified cohort. Until then, ask any candidate for their credential code and check it yourself."}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/verify">Verify a credential</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {talent.map((person) => (
              <li key={person.username}>
                <Link
                  href={`/talent/${person.username}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start gap-3">
                    {person.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.avatar_url}
                        alt=""
                        className="size-12 shrink-0 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium group-hover:text-primary">
                        {person.full_name ?? person.username}
                      </p>
                      {person.headline && (
                        <p className="text-sm text-muted-foreground">
                          {person.headline}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    {person.location}
                  </p>

                  <ul className="flex flex-wrap gap-1.5">
                    {person.credentials.map((c) => (
                      <li key={c.title}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[0.65rem] font-semibold text-verified-foreground uppercase">
                          <BadgeCheck className="size-3" aria-hidden />
                          {c.title}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {person.skills.length > 0 && (
                    <ul className="mt-auto flex flex-wrap gap-1.5">
                      {person.skills.slice(0, 4).map((s) => (
                        <li key={s}>
                          <Badge variant="secondary">{s}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">
            Looking for someone specific?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us the role and we&apos;ll point you at the people who hold
            the right credential. No fee, no account.
          </p>
          <Button asChild className="mt-4">
            <Link href="/employers/enquire">Send an enquiry</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
