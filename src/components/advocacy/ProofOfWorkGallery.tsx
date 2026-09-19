import { Camera } from "lucide-react";
import { advocacy } from "@/content/advocacy";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

/**
 * A styled stand-in for a photo that has not been supplied yet.
 *
 * No real image exists for these files, so this deliberately does not render
 * an `<img>`/`next/image` pointed at a path that would 404. Instead it shows
 * the filename and description the real photo should carry, and exposes that
 * same text to assistive tech via `role="img"` + `aria-label` — the
 * accessible name a screen reader announces mirrors the alt text the eventual
 * `<Image alt="…">` will use once the file is dropped into
 * `/public/proof-of-work`.
 */
function PhotoSlot({
  file,
  alt,
  className,
}: {
  file: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "glass-panel-strong glass-panel relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-dashed p-4 text-center",
        className,
      )}
    >
      <Camera className="size-6 text-muted-foreground/70" aria-hidden />
      <p className="font-mono text-xs text-muted-foreground">{file}</p>
      <p className="text-xs leading-snug text-muted-foreground">{alt}</p>
    </div>
  );
}

/**
 * The Proof of Work gallery: Jops speaking at universities, plus the Wobex
 * hackathon. Sits below the hero on the landing page as an addition, not a
 * replacement — the hero, AI Readiness Test and certification sections above
 * it are untouched.
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

      <Reveal delay={0.08} className="mt-8">
        <PhotoSlot
          file={advocacy.heroPhoto.file}
          alt={advocacy.heroPhoto.alt}
          className="aspect-[21/9] w-full rounded-2xl"
        />
      </Reveal>

      <Reveal delay={0.12} className="mt-12">
        <h3 className="font-display text-xl font-semibold sm:text-2xl">
          {advocacy.gallery.heading}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {advocacy.gallery.body}
        </p>
      </Reveal>

      <Stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {advocacy.gallery.items.map((item) => (
          <StaggerItem key={item.slug}>
            <article className="glass-panel flex h-full flex-col gap-4 rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-2">
                {item.photos.slice(0, 4).map((file) => (
                  <PhotoSlot
                    key={file}
                    file={file}
                    alt={`${item.name}, ${item.description}`}
                  />
                ))}
              </div>
              <div>
                <span className="rounded-full bg-brand/15 px-2.5 py-1 text-micro font-semibold tracking-wide text-verified-text uppercase">
                  {item.kind === "hackathon" ? "Hackathon" : "University talk"}
                </span>
                <h4 className="mt-3 font-semibold">{item.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.location} · {item.date}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.1} className="mt-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {advocacy.gallery.note}
        </p>
      </Reveal>
    </section>
  );
}
