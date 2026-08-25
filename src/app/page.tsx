import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Check,
  BookOpen,
  Headset,
  Megaphone,
  ShieldCheck,
  Share2,
  Terminal,
  Wallet,
} from "lucide-react";
import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/credential-card";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import {
  AnimatedHeading,
  AuroraField,
  ConvergeCard,
  CountUpOnView,
  Float,
  GlowCard,
  Grain,
  GridField,
  HeroScrollFade,
  Marquee,
  Parallax,
  PageAmbience,
  ScrollProgress,
  Sheen,
  SpotlightPanel,
  TypeHeading,
} from "@/components/motion/landing-motion";
import Image from "next/image";
import { HeroMedia } from "@/components/motion/hero-media";

/**
 * Button colours for the hero panel.
 *
 * `--primary` is a deepened lime chosen to pass AA as text and as a fill on the
 * *page* background, which flips with the theme. The hero panel does not flip:
 * it is ink in both. In light mode the default primary therefore rendered dark
 * green on near-black, which is the one button on the page that has to be
 * unmissable. On ink, the logo's actual neon is both correct and legible.
 */
const ON_INK_PRIMARY =
  "bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:ring-brand/40";

/**
 * Subject to icon. Kept here rather than in `src/content/landing.ts` because a
 * component is not content: the copy file stays editable by somebody who does
 * not know what a lucide import is, and it carries the key instead.
 */
const TRACK_ICONS = {
  foundations: BookOpen,
  blockchain: Blocks,
  finance: Wallet,
  assistance: Headset,
  marketing: Megaphone,
  social: Share2,
  prompting: Terminal,
} as const;

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
    <div className="relative flex min-h-svh flex-col">
      {/* Behind everything, fixed to the viewport, following the cursor. The
          section backgrounds below are translucent so it actually shows: an
          opaque bg-card would simply cover it up. */}
      <PageAmbience />
      <ScrollProgress />
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        {/*
          A dark inset panel, a photograph on a brand-coloured plate, and the
          credential card floating across the corner of it.

          The first version put the credential card alone on a flat slab of
          lime. It was legible and it read cheap: a large area of unbroken
          saturated colour with a rectangle sitting on it has no depth, and next
          to type this careful it looked like a different site. The plate is now
          a soft gradient rotated a couple of degrees behind a photograph, and
          the card sits over the photo as glass, which is where the depth comes
          from.

          The photograph is atmosphere. It carries no name, no caption and no
          quote, because a stock portrait labelled as a graduate is a fabricated
          testimonial on the one page arguing that claims should be checkable.
          public/landing/CREDITS.md keeps that rule next to the files.

          Everything above the fold animates in CSS. motion writes its initial
          opacity 0 into the server HTML, so a JS-driven hero leaves the
          headline invisible until hydration, and invisible for good if the
          bundle never lands.
        */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-2">
          <HeroScrollFade>
            <SpotlightPanel className="relative isolate overflow-hidden rounded-3xl bg-ink px-6 py-14 ring-1 ring-white/10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
              <AuroraField />
              <GridField />
              <Grain />

              <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                <div className="max-w-xl">
                  <p
                    className="rise-in mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-2 text-xs font-medium text-white/75"
                    style={{ animationDelay: "0.05s" }}
                  >
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-brand" />
                    </span>
                    Verified certification, built in the Philippines
                  </p>

                  <AnimatedHeading
                    as="h1"
                    text={landing.hero.heading}
                    className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.02em] text-balance text-white sm:text-5xl lg:text-[3.4rem]"
                    delay={0.1}
                    stagger={0.05}
                  />

                  <p
                    className="rise-in mt-6 max-w-lg text-base leading-[1.65] text-white/65 sm:text-lg"
                    style={{ animationDelay: "0.6s" }}
                  >
                    {landing.hero.subheading}
                  </p>

                  <div
                    className="rise-in mt-9 flex flex-col gap-3 sm:flex-row"
                    style={{ animationDelay: "0.72s" }}
                  >
                    {user ? (
                      <Button asChild size="lg" className={cn("h-12", ON_INK_PRIMARY)}>
                        <Link href="/dashboard">
                          Go to my dashboard
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="lg" className={cn("h-12", ON_INK_PRIMARY)}>
                          <Link href={landing.hero.primary.href}>
                            {landing.hero.primary.label}
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="lg"
                          variant="outline"
                          className="h-12 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                        >
                          <Link href={landing.hero.secondary.href}>
                            {landing.hero.secondary.label}
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Facts, not badges. Every one is checkable on this site. */}
                  <ul
                    className="rise-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50"
                    style={{ animationDelay: "0.84s" }}
                  >
                    {landing.hero.pills.map((pill) => (
                      <li key={pill} className="flex items-center gap-2">
                        <Check className="size-3.5 text-brand" aria-hidden />
                        {pill}
                      </li>
                    ))}
                  </ul>
                </div>

                {/*
                  The clip, its plate, and the credential beneath it.

                  The card used to sit across the corner of the video, and it
                  could not be made to work: a tall portrait clip and a card
                  wide enough not to wrap "CAVA-2026-000001" are both about the
                  width of this column, so wherever the card went it covered the
                  person. Moving it to each corner in turn just moved which part
                  of her it hid.

                  Stacking solves it outright. The card overlaps the bottom edge
                  of the clip by a little, which keeps them reading as one
                  object, and takes the full column width, which is what stops
                  the credential code breaking across two lines.
                */}
                <div
                  className="rise-in relative mx-auto hidden w-full max-w-[22rem] lg:block"
                  style={{ animationDelay: "0.4s" }}
                >
                  {/* Gradient, rotated, softened at the edge. A flat rectangle
                      of saturated colour is what made the first version cheap. */}
                  <div
                    aria-hidden
                    className="absolute -inset-3 bottom-24 -z-10 rotate-3 rounded-[1.75rem] bg-[linear-gradient(140deg,var(--brand),var(--brand-cyan))] opacity-90 blur-[2px]"
                  />
                  <div className="relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-white/20">
                    <HeroMedia className="absolute inset-0 size-full object-cover" />
                    {/* Ties the clip into the panel, and darkens the strip the
                        card overlaps so the two do not fight. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent"
                    />
                  </div>

                  <Float amplitude={6} duration={6} className="relative -mt-12">
                    <div className="rounded-2xl border border-white/15 bg-ink/80 p-1 shadow-2xl backdrop-blur-md">
                      <CredentialCard
                        state="verified"
                        holderName="Juana D. (Demo credential)"
                        title="Certified AI Virtual Assistant"
                        level="Professional certification"
                        credentialCode="CAVA-2026-000001"
                        issuedAt={new Date("2026-08-01")}
                      />
                    </div>
                  </Float>
                </div>
              </div>
            </SpotlightPanel>
          </HeroScrollFade>
        </section>

        {/* ── The catalogue, counted ───────────────────────────────────── */}
        {/*
          The slot a template fills with student counts and partner logos.
          There is no honest number of learners to print before the first
          cohort, and an invented one on this page would refute the page.
          These are read from the live catalogue instead.
        */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <Stagger className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {landing.stats.items.map((stat) => (
              <StaggerItem key={stat.label}>
                {/* The sweep is the certificate metaphor: light crossing
                    foil. It belongs on the numbers, which are the one place on
                    this page making a claim about the catalogue. */}
                <p className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">
                  <Sheen>
                    <CountUpOnView to={Number(stat.value)} />
                  </Sheen>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal delay={0.15}>
            <p className="mt-8 text-sm text-muted-foreground">
              {landing.stats.note}
            </p>
          </Reveal>

          {/* The subjects, running past. Pure CSS so it pauses on hover and
              costs the scrolling thread nothing. Every item is a real course
              in the catalogue. */}
          <Reveal delay={0.2}>
            <Marquee
              className="mt-12 border-y border-border py-5"
              items={landing.tracks.items.map((t) => t.title)}
            />
          </Reveal>
        </section>

        {/* ── The problem ──────────────────────────────────────────────── */}
        <section className="border-b border-border bg-card/60 backdrop-blur-[2px]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <Reveal>
              <TypeHeading
                text={landing.problem.heading}
                className="font-display max-w-2xl text-2xl font-semibold sm:text-3xl"
              />
              <p className="mt-4 max-w-2xl text-muted-foreground">
                {landing.problem.body}
              </p>
            </Reveal>

            <Stagger className="mt-10 grid gap-6 sm:grid-cols-2" delay={0.1}>
              {landing.problem.points.map((point) => (
                <StaggerItem
                  key={point.title}
                  className="rounded-lg border border-border bg-background/70 p-5 backdrop-blur-sm"
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
            <TypeHeading
                text={landing.offer.heading}
                className="font-display text-2xl font-semibold sm:text-3xl"
              />
          </Reveal>

          {/* The four start pulled toward the centre and separate into their
              places as the section is scrolled through. Left column comes from
              the right, right column from the left, so the set opens outwards. */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {landing.offer.items.map((item, i) => (
              <ConvergeCard
                key={item.title}
                fromX={i % 2 === 0 ? 120 : -120}
                fromY={i < 2 ? 40 : -40}
                className="flex gap-4 rounded-lg border border-border bg-card/50 p-5 backdrop-blur-sm"
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
              </ConvergeCard>
            ))}
          </div>
        </section>

        {/* ── Who this is for ─────────────────────────────────────────── */}
        {/*
          Photography, used as atmosphere and nothing more.

          There is deliberately no caption, no name and no quote attached to any
          of these. They are stock portraits under the Pexels licence, and the
          moment one carries "Maria, VA, Cebu" it becomes a fabricated
          testimonial on the one page whose entire argument is that claims
          should be checkable. See public/landing/CREDITS.md.

          Each image drifts at a different rate against the scroll, which is
          what stops a three-image row reading as a flat strip. Desktop only:
          scroll-linked transforms are the classic source of stutter on a phone,
          and the fallback is simply the same images, still.
        */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <Reveal className="max-w-2xl">
            <TypeHeading
              text="Built for the work you actually do"
              className="font-display text-2xl font-semibold sm:text-3xl"
            />
            <p className="mt-4 text-muted-foreground">
              Students, virtual assistants, freelancers and jobseekers. Written
              for a phone on a commute and a laptop at a kitchen table, in the
              country you are actually working from.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            <Parallax distance={26} className="lg:col-span-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src="/landing/remote-work.jpg"
                  alt="A man working at a laptop at a small round table."
                  fill
                  sizes="(min-width: 1024px) 50vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Parallax>

            <Parallax distance={-18}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <Image
                  src="/landing/learner-portrait.jpg"
                  alt="A woman sitting with an open laptop on her lap."
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Parallax>

            <Parallax distance={34}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <Image
                  src="/landing/focused-desk.jpg"
                  alt="A woman working at a desk beside a window and a plant."
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Parallax>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card/60 backdrop-blur-[2px]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <Reveal>
              <TypeHeading
                text={landing.ladder.heading}
                className="font-display text-2xl font-semibold sm:text-3xl"
              />
            </Reveal>

            {/* Right to left, one after another. Not a Stagger: these are
                plain CSS so the three steps are readable with no JavaScript,
                and the delay carries the sequence instead of an observer. */}
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {landing.ladder.steps.map((step, i) => (
                <div
                  key={step.title}
                  className="slide-in-right"
                  style={{ animationDelay: `${(i * 0.14).toFixed(2)}s` }}
                >
                  {/* Ticks like the stats band. Two digits, so it counts
                      through 01 rather than flashing straight to it. */}
                  <p className="font-mono text-sm text-muted-foreground tabular-nums">
                    <CountUpOnView to={i + 1} duration={0.5} pad={2} />
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

        {/* ── What we teach ───────────────────────────────────────────── */}
        {/*
          A grid of subjects, and not one of them is a link. The catalogue is
          behind the login and public-pages.spec.ts asserts this page never
          links into it: a card that answers with a redirect wastes the click.
          The grid says what exists and the account is the door.
        */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <Reveal className="max-w-2xl">
            <TypeHeading
                text={landing.tracks.heading}
                className="font-display text-2xl font-semibold sm:text-3xl"
              />
            <p className="mt-4 text-muted-foreground">{landing.tracks.body}</p>
          </Reveal>

          {/* The columns arrive from different sides and meet in the middle:
              left column from the left, right column from the right, middle
              rises. CSS again, so seven cards do not depend on a bundle. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landing.tracks.items.map((item, i) => {
              const Icon = TRACK_ICONS[item.icon];
              const column = i % 3;
              const entrance =
                column === 0
                  ? "slide-in-left"
                  : column === 2
                    ? "slide-in-right"
                    : "rise-in";
              return (
                <div
                  key={item.title}
                  className={cn("h-full", entrance)}
                  style={{
                    animationDelay: `${(Math.floor(i / 3) * 0.12).toFixed(2)}s`,
                  }}
                >
                  <GlowCard className="h-full rounded-xl border border-border bg-card/80 p-5 backdrop-blur-sm transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {item.free && (
                      <span className="rounded-full bg-brand px-2.5 py-1 text-micro font-semibold tracking-wide text-brand-foreground uppercase">
                        Free
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">
                    {item.body}
                  </p>
                  </GlowCard>
                </div>
              );
            })}
          </div>

          {!user && (
            <Reveal delay={0.2}>
              <Button asChild className="mt-10 h-12">
                <Link href="/signup">
                  Create an account to open them
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </Reveal>
          )}
        </section>

        {/* ── Employers ────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card/60 backdrop-blur-[2px]">
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
