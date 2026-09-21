import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  BookOpen,
  Briefcase,
  Check,
  FileText,
  Headset,
  Megaphone,
  MessageSquare,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Table2,
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
  CountUpOnView,
  Float,
  GlowCard,
  HeroScrollFade,
  Marquee,
  PageAmbience,
  ScrollProgress,
  Sheen,
  SpotlightPanel,
  TypeHeading,
} from "@/components/motion/landing-motion";
import { HeroMedia } from "@/components/motion/hero-media";
import { ProofOfWorkGallery } from "@/components/advocacy/ProofOfWorkGallery";

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
  safety: ShieldCheck,
  finance: Wallet,
  freelancing: Briefcase,
  careers: FileText,
  blockchain: Blocks,
  assistance: Headset,
  communication: MessageSquare,
  marketing: Megaphone,
  design: Palette,
  commerce: ShoppingBag,
  admin: Table2,
} as const;

/** The twelve tracks, chunked into the rows "What we teach" scrolls as. */
const TRACK_ROWS = Array.from(
  { length: Math.ceil(landing.tracks.items.length / 3) },
  (_, row) => landing.tracks.items.slice(row * 3, row * 3 + 3),
);

/**
 * One endlessly scrolling row of the "What we teach" marquee.
 *
 * The track holds three back-to-back copies of the row's three cards and
 * animates via `.gn-track-marquee` (globals.css), which is a pure CSS
 * `translate3d` loop — no rAF, no scroll listener, nothing that depends on a
 * JS bundle to keep moving. `reverse` flips the direction with
 * `animation-direction: reverse` rather than a second keyframe, so the loop
 * stays exactly as seamless run backwards as it is forwards.
 *
 * Only the first copy is exposed to assistive tech (`aria-hidden` on the
 * other two): the cards are read as one set of tracks, not three.
 *
 * Hover/focus-within pause the animation (`.group:hover .gn-track-marquee`,
 * globals.css) so a reader can actually look at or tab through a card
 * instead of it sliding away — and since these cards hold no links or
 * controls (see the comment above), a mouse hover is the only way anyone
 * would want to pause one, but focus-within is included in case that ever
 * changes.
 */
function TrackMarqueeRow({
  items,
  reverse,
}: {
  items: (typeof landing.tracks.items)[number][];
  reverse: boolean;
}) {
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
      <div
        className={cn(
          "gn-track-marquee flex w-max gap-4",
          reverse && "gn-track-marquee-reverse",
        )}
      >
        {[0, 1, 2].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy !== 0}
            className="flex shrink-0 gap-4"
          >
            {items.map((item) => {
              const Icon = TRACK_ICONS[item.icon];
              return (
                <div key={item.title} className="w-64 shrink-0 sm:w-80 lg:w-96">
                  <GlowCard className="glass-panel-bright-fill gn-shine h-full rounded-xl border border-border p-5 transition-colors hover:border-primary/40">
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
                    <h3 className="mt-4 font-semibold tracking-wide uppercase">{item.title}</h3>
                    <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">
                      {item.body}
                    </p>
                  </GlowCard>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

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
              {/* No AuroraField/GridField/Grain here: the panel is translucent
                  specifically so PageAmbience's single instance of each shows
                  through, per the comment above. A second copy was pure
                  duplication (8 blurred orbs animating at once). */}

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
                    Practical basics. Verifiable skills.
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
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-14">
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

        {/* ── Proof of work ────────────────────────────────────────────── */}
        {/* Advocacy addition, grouped with the catalogue stats above it and
            the AI Readiness Test / certification copy that follows it,
            without reordering or replacing anything else on the page. */}
        <ProofOfWorkGallery />

        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <Reveal className="rounded-2xl border border-border bg-card/75 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {landing.certificateReasons.eyebrow}
              </p>
              <h2 className="font-display mt-3 max-w-2xl text-2xl font-semibold text-balance sm:text-3xl">
                {landing.certificateReasons.heading}
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
                {landing.certificateReasons.body}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {landing.certificateReasons.items.map((item, index) => (
                  <div
                    key={item.title}
                    className="glass-panel-bright gn-shine overflow-hidden rounded-xl p-4"
                    style={{ "--gn-shine-delay": `${index * 0.6}s` } as CSSProperties}
                  >
                    <BadgeCheck className="size-5 text-primary" aria-hidden />
                    <h3 className="mt-3 font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal
              delay={0.12}
              className="flex flex-col justify-between rounded-2xl bg-brand p-6 text-brand-foreground sm:p-8"
            >
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-70">
                  {landing.certificateReasons.test.eyebrow}
                </p>
                <h2 className="font-display mt-3 text-2xl font-semibold text-balance">
                  {landing.certificateReasons.test.heading}
                </h2>
                <p className="mt-4 text-sm leading-relaxed opacity-80">
                  {landing.certificateReasons.test.body}
                </p>
              </div>
              {/*
                This card is `bg-brand` (the neon lime). The default Button
                variant's `.button-glass` rule (globals.css) paints its own
                background/border with higher CSS specificity than any
                Tailwind `bg-*`/`border-*` utility class, so a plain `bg-ink
                text-white` here never actually painted ink — it silently
                rendered the same bright lime as the card behind it, with
                white text on top: ~1.4:1 text contrast, and a button that
                was visually indistinguishable from its own card (lime pill
                on a lime card reads as one flat block, not a control).
                Text-only fixes (e.g. `text-brand-foreground`) solve the AA
                number but not this: near-black text on the *same* lime as
                the card still visually fuses button and card together. The
                fix has to invert the fill, not just re-tint the text, and
                it has to win the specificity fight — inline `style` always
                beats an unlayered stylesheet rule, `!important` or not, so
                it is used here instead of a class.
              */}
              <Button
                asChild
                size="lg"
                className="mt-8 h-12 border-2 text-brand hover:brightness-125"
                style={{
                  backgroundColor: "var(--ink)",
                  borderColor: "var(--ink)",
                }}
              >
                <Link href={landing.certificateReasons.test.cta.href}>
                  {landing.certificateReasons.test.cta.label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* ── What we teach ───────────────────────────────────────────── */}
        {/*
          A grid of subjects, and not one of them is a link. The catalogue is
          behind the login and public-pages.spec.ts asserts this page never
          links into it: a card that answers with a redirect wastes the click.
          The grid says what exists and the account is the door.
        */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <Reveal className="mx-auto max-w-2xl text-center">
            <TypeHeading
                text={landing.tracks.heading}
                className="font-display text-2xl font-semibold sm:text-3xl"
              />
            <p className="mt-4 text-muted-foreground">{landing.tracks.body}</p>
          </Reveal>

          {/*
            Four rows of three, each an independent, endlessly scrolling
            marquee (row 1 and 3 right-to-left, row 2 and 4 left-to-right:
            `TrackMarqueeRow`, defined below), so twelve tracks read as more
            than a static block without asking anyone to click through them.
            `prefers-reduced-motion: reduce` gets the original static grid
            instead, via Tailwind's built-in `motion-reduce:` variant: pure
            CSS, evaluated before hydration, so nobody who asked not to see
            continuous motion is shown a frozen or half-built marquee.
          */}
          <Reveal className="mt-10">
            <div className="hidden gap-4 sm:grid-cols-2 lg:grid-cols-3 motion-reduce:grid">
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
                    className={cn("slide-far h-full", entrance)}
                    style={{
                      animationDelay: `${(Math.floor(i / 3) * 0.12).toFixed(2)}s`,
                    }}
                  >
                    <GlowCard className="glass-panel-bright-fill gn-shine h-full rounded-xl border border-border p-5 transition-colors hover:border-primary/40">
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
                      <h3 className="mt-4 font-semibold tracking-wide uppercase">{item.title}</h3>
                      <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">
                        {item.body}
                      </p>
                    </GlowCard>
                  </div>
                );
              })}
            </div>

            <div className="motion-reduce:hidden space-y-4">
              {TRACK_ROWS.map((rowItems, rowIndex) => (
                <TrackMarqueeRow
                  key={rowIndex}
                  items={rowItems}
                  reverse={rowIndex % 2 === 1}
                />
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Hiring & verification ────────────────────────────────────── */}
        {/*
          "If you are hiring" and the free-account pitch used to be two
          separate sections stacked back to back with only a border between
          them, which read as one idea broken in half for no reason. They are
          one section now: two columns sharing a single card, split by a
          vertical rule on desktop (`sm:border-l`, the same `border-border`
          token every other divider on this page uses) and stacked with both
          halves centered on mobile, rather than the employer copy staying
          left-aligned under a narrower viewport where there is no second
          column to justify it.
        */}
        <section className="overflow-x-clip border-y border-border bg-card/60 backdrop-blur-[2px]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:py-16">
            <Reveal className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <ShieldCheck className="size-6 text-primary" aria-hidden />
              <h2 className="font-display mt-4 text-2xl font-semibold sm:text-3xl">
                {landing.employers.heading}
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                {landing.employers.body}
              </p>
              <Button asChild variant="outline" className="mt-6 h-11">
                <Link href={landing.employers.cta.href}>
                  {landing.employers.cta.label}
                </Link>
              </Button>
            </Reveal>

            <Reveal
              delay={0.1}
              className="flex flex-col items-center border-t border-border pt-10 text-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-10"
            >
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
