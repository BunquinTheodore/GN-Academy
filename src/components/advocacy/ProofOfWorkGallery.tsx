import Image from "next/image";
import { advocacy } from "@/content/advocacy";
import type { ProofOfWorkPhoto } from "@/content/advocacy";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

/** The eleven supplied campus/event photos, split into two marquee rows. */
const PHOTO_ROWS: ProofOfWorkPhoto[][] = [
  advocacy.gallery.photos.slice(0, 6),
  advocacy.gallery.photos.slice(6),
];

/**
 * One endlessly scrolling row of real campus/event photos.
 *
 * Same mechanism as `TrackMarqueeRow` in `src/app/page.tsx`'s "What we
 * teach" section: the track holds three back-to-back copies of the row's
 * photos and animates via `.gn-track-marquee` (globals.css), a pure CSS
 * `translate3d` loop — no rAF, no scroll listener, nothing that depends on a
 * JS bundle to keep moving. `reverse` flips the direction with
 * `animation-direction: reverse`, so the loop stays exactly as seamless run
 * backwards as it is forwards.
 *
 * Only the first copy is exposed to assistive tech (`aria-hidden` on the
 * other two): the row is read as one set of photos, not three. Hover/
 * focus-within pause the animation (`.group:hover .gn-track-marquee`,
 * globals.css) so a visitor can actually look at a photo instead of it
 * sliding away.
 */
function PhotoMarqueeRow({
  photos,
  reverse,
}: {
  photos: ProofOfWorkPhoto[];
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
            {photos.map((photo) => (
              <div
                key={photo.file}
                className="glass-panel gn-shine relative aspect-[4/3] w-64 shrink-0 overflow-hidden rounded-xl border border-border sm:w-80"
              >
                <Image
                  src={`/proof-of-work/campus/${photo.file}`}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 640px) 320px, 256px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The same eleven photos, laid out as a static, non-overlapping grid. */
function PhotoGridFallback() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {advocacy.gallery.photos.map((photo) => (
        <div
          key={photo.file}
          className="glass-panel gn-shine relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
        >
          <Image
            src={`/proof-of-work/campus/${photo.file}`}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The Proof of Work gallery: Jops speaking at universities, plus expo and
 * hackathon appearances. Sits below the hero on the landing page as an
 * addition, not a replacement — the hero, AI Readiness Test and
 * certification sections above it are untouched.
 *
 * The photo grid used to break each appearance out into its own card with a
 * school/event name, city and date — all still TODO placeholders since none
 * of that has been confirmed by Jops. Rather than ship a page full of
 * TODO-labelled cards, this instead shows the real photos on hand as a
 * continuously scrolling strip (two rows, opposite directions), the same
 * seamless CSS marquee used by "What we teach" above. No per-event claims
 * are made; the photos speak for themselves.
 */
export function ProofOfWorkGallery() {
  return (
    <section
      id="proof-of-work"
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16"
    >
      <Reveal className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {advocacy.intro.eyebrow}
        </p>
        <h2 className="font-display mt-3 text-2xl font-semibold text-balance sm:text-3xl">
          {advocacy.intro.heading}
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {advocacy.intro.body}
        </p>
      </Reveal>

      {/*
        `prefers-reduced-motion: reduce` gets a static grid of the same
        photos instead, via Tailwind's built-in `motion-reduce:` variant:
        pure CSS, evaluated before hydration, so nobody who asked not to see
        continuous motion is shown a frozen or half-built marquee.
      */}
      <Reveal delay={0.08} className="mt-8">
        <div className="hidden motion-reduce:block">
          <PhotoGridFallback />
        </div>

        <div className="motion-reduce:hidden space-y-4">
          {PHOTO_ROWS.map((rowPhotos, rowIndex) => (
            <PhotoMarqueeRow
              key={rowIndex}
              photos={rowPhotos}
              reverse={rowIndex % 2 === 1}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
