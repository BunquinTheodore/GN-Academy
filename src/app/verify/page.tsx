import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { getTalentFacets, listPublicTalent } from "@/lib/db/talent";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Credentials Verification",
  description:
    "Check any GN Academy credential code and see exactly what its holder earned, or browse the directory of employer-ready talent who already hold one. No account needed either way.",
  alternates: { canonical: "/verify" },
};

export const revalidate = 300;

async function lookupAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  redirect(`/verify/${encodeURIComponent(code || "unknown")}`);
}

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
          ? "inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground"
          : "inline-flex min-h-9 items-center rounded-full border border-border px-3.5 text-sm hover:border-primary/50"
      }
    >
      {label}
    </Link>
  );
}

/**
 * Credentials Verification combines what used to be two separate public
 * pages, /verify (an individual credential-code lookup) and /employers (a
 * talent directory filterable by skill and certification). Both are ways of
 * doing the same underlying thing, checking that a claimed AI skill is real,
 * just from two different starting points: someone hands you one code, or
 * you want to browse everyone who already has one. /employers now redirects
 * here (see next.config.ts); /verify survives as the base route because
 * /verify/[code] is a meaningful, permanent, externally linked child route
 * (printed on certificates, on CVs) that a URL change would break.
 *
 * Two glass panels side by side on desktop, same pattern as /faq: the
 * lookup tool on the left, the directory on the right, matching headers and
 * equal column width so the two halves read as one page rather than a
 * primary feature with the other bolted on. Single column on mobile, tool
 * first since a single code is the faster path for most visitors.
 */
export default async function VerifyPage({
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
  const skill =
    requested.skill && facets.skills.includes(requested.skill)
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
    return qs ? `/verify?${qs}` : "/verify";
  };

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
            Credentials Verification
          </h1>
          <p className="mt-3 text-muted-foreground">
            One tool, two ways to use it. Check a single credential code
            someone gave you, or browse everyone who already holds one and is
            open to work. Both are public and neither needs an account.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="glass-panel gn-shine overflow-hidden rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold sm:text-xl">
              Verify a credential
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every GN Academy credential has a code like{" "}
              <span className="font-mono text-foreground">
                CAVA-2026-001248
              </span>
              , printed on the certificate and listed on the holder&apos;s CV.
              Enter it below to see the holder, certification, competencies,
              and status.
            </p>

            <form action={lookupAction} className="mt-6 flex flex-col gap-3">
              <Label htmlFor="code">Credential code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  name="code"
                  placeholder="CAVA-2026-000001"
                  autoComplete="off"
                  className="h-12 font-mono uppercase"
                  required
                />
                <Button type="submit" className="h-12">
                  Verify
                </Button>
              </div>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Verification pages are public and permanent. A revoked
              credential shows as revoked. It never silently disappears.
            </p>
          </div>

          <div className="glass-panel gn-shine overflow-hidden rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold sm:text-xl">
              Hire verified talent
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Everyone listed here passed a scored assessment and holds a
              credential with a public verification page, like the one on the
              left. There is no unverified tier to filter out. That is the
              whole point.
            </p>

            {(facets.skills.length > 0 || facets.certifications.length > 0) && (
              <div className="mt-6 flex flex-col gap-4">
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
              <p className="mt-6 rounded-lg border border-destructive/40 p-5 text-sm">
                The directory couldn&apos;t load. Refresh to try again.
              </p>
            ) : talent.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-border p-6">
                <p className="text-sm text-muted-foreground">
                  {skill || certification
                    ? "Nobody matches those filters yet."
                    : "The directory opens with our first certified cohort. Until then, ask any candidate for their credential code and check it on the left."}
                </p>
              </div>
            ) : (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {talent.map((person) => (
                  <li key={person.username}>
                    <Link
                      href={`/talent/${person.username}`}
                      className="group flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-start gap-3">
                        {person.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={person.avatar_url}
                            alt=""
                            className="size-10 shrink-0 rounded-full border border-border object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary">
                            {person.full_name ?? person.username}
                          </p>
                          {person.headline && (
                            <p className="text-xs text-muted-foreground">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2 py-0.5 text-micro font-semibold text-verified-foreground uppercase">
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

            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Looking for someone specific? Tell us the role and
                we&apos;ll point you at the people who hold the right
                credential. No fee, no account.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/employers/enquire">Send an enquiry</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
