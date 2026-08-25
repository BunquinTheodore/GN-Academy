"use client";

import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page's extended motion vocabulary.
 *
 * `reveal.tsx` holds the quiet primitives the whole site shares. This file is
 * the loud half, and it is imported by the landing page and nowhere else. A
 * marketing page can afford motion that a lesson someone is trying to read
 * cannot: a cursor-tracking glow behind a course card would be a distraction
 * three chapters into Basic Finance.
 *
 * Three rules run through all of it.
 *
 * Everything collapses under `prefers-reduced-motion`, and for the ambient
 * pieces that means nothing at all rather than a slower version. Drift,
 * parallax and pointer-tracking are precisely what that setting exists to
 * stop, and for some people they cause real nausea rather than mild irritation.
 *
 * Nothing animates a property that costs layout. Transform and opacity only,
 * so the compositor does the work. This audience is largely on mid-range
 * phones over mobile data.
 *
 * Pointer and scroll handlers write to motion values, never to React state. A
 * `setState` on pointermove re-renders the tree sixty times a second, which is
 * how a page meant to feel expensive ends up stuttering on the hardware most
 * of these visitors actually hold.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Reduced motion is `boolean | null` before hydration; treat unknown as "no". */
function useReduced(): boolean {
  return useReducedMotion() === true;
}

/**
 * Whether this device should get the expensive effects.
 *
 * Not every visitor's phone can afford what a laptop can, and "premium" on a
 * mid-range Android means the page scrolls at sixty frames rather than that it
 * carries one more gradient. Two things are gated on this: pointer-tracking
 * light, which has nothing to follow on a touchscreen anyway, and scroll-linked
 * transforms, which are the classic cause of stutter on mobile because they run
 * work on every scroll event on the thread that is also doing the scrolling.
 *
 * Starts false and turns on after mount. That is deliberate: the server cannot
 * know the viewport, so rendering the cheap version first and enriching on the
 * client is the only version of this that does not hydrate mismatched.
 */
function useRichMotion(): boolean {
  const reduced = useReduced();
  const [rich, setRich] = useState(false);

  useEffect(() => {
    if (reduced) {
      setRich(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const update = () => setRich(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduced]);

  return rich;
}

// ────────────────────────────────────────────────────────────────────────────
// Text
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reveals a heading one word at a time, each rising out of a slight blur.
 *
 * Word by word, not letter by letter. Letters read as a typewriter and leave
 * the sentence unreadable while they play; words let the eye start reading
 * immediately, which is the difference between motion that flatters the copy
 * and motion that fights it.
 *
 * CSS rather than motion/react, and on the hero's h1 that distinction is not
 * cosmetic. motion writes its initial `opacity: 0` into the server-rendered
 * markup, so a JS-driven version leaves the most important sentence on the site
 * invisible until hydration completes, and permanently invisible if the bundle
 * never arrives. A keyframe animation cannot fail that way, and it runs off the
 * main thread, which the hero needs because several things move there at once.
 *
 * No `whileInView` either, for the same reason: an IntersectionObserver is more
 * JavaScript standing between a visitor and a headline. Headings below the fold
 * simply animate when the CSS applies, which nobody has ever noticed.
 *
 * The real string also sits in an `sr-only` span with the animated words hidden
 * from assistive technology, because a screen reader walking a heading built
 * from thirty spans announces it as thirty separate things.
 */
export function AnimatedHeading({
  text,
  className,
  as: Tag = "h2",
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="inline-block overflow-hidden align-bottom"
          >
            <span
              className="gn-word inline-block"
              // Rounded, or floating point puts "0.15000000000000002s" in
              // the server HTML of every heading on the page.
              style={{ animationDelay: `${(delay + i * stagger).toFixed(3)}s` }}
            >
              {word}
              {i < words.length - 1 ? " " : null}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * React warns when useLayoutEffect runs during SSR, and the typing heading
 * genuinely needs the layout phase: it has to empty the text after hydration
 * but before the browser paints, or the full heading flashes and then retypes
 * itself, which looks like a bug rather than an effect.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A heading that types itself out when it is scrolled to, at a speed set by how
 * long it is and how fast the reader is moving.
 *
 * THE SERVER RENDERS THE WHOLE STRING. That is the important part. Typing is
 * inherently a JavaScript effect, and the naive version starts from an empty
 * string, which means every section heading on the page is blank until
 * hydration and blank for good if the bundle never lands. Here the heading is
 * complete in the HTML, and the layout effect clears it before first paint only
 * once JavaScript is actually running.
 *
 * Two things set the speed:
 *
 * Length. Total duration is clamped, so a three-word heading and a nine-word
 * heading both finish in about the same beat rather than the long one dragging.
 * A heading nobody can read yet is a heading in the way of the page.
 *
 * Scroll velocity. Somebody moving fast is skimming and should not be made to
 * wait for an animation; somebody who has stopped gets the full effect. The
 * velocity is sampled once, when the heading comes into view, rather than
 * tracked continuously, because a heading that speeds up and slows down as you
 * move reads as a stutter.
 */
export function TypeHeading({
  text,
  className,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const reduced = useReduced();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-90px" });

  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);

  const [shown, setShown] = useState(text.length);
  const [armed, setArmed] = useState(false);

  // Empty it before the first paint, but only where JS is running.
  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    setShown(0);
    setArmed(true);
  }, [reduced, text]);

  useEffect(() => {
    if (reduced || !armed || !inView) return;

    // Bounded either way: long headings type faster per character so the whole
    // line still lands in about a second.
    const base = Math.min(1150, Math.max(420, text.length * 17));

    // A fast scroll shortens it, down to a floor. px/s, sampled once.
    const speed = Math.abs(velocity.get());
    const urgency = Math.min(1, speed / 2600);
    const duration = base * (1 - 0.5 * urgency);

    const perChar = duration / Math.max(1, text.length);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) window.clearInterval(id);
    }, perChar);

    return () => window.clearInterval(id);
  }, [armed, inView, reduced, text, velocity]);

  return (
    <Tag className={className}>
      <div ref={ref} className="contents">
        {/* The real heading, once, for assistive technology and for anyone
            reading the HTML. The typed copy is decoration over the top. */}
        <span className="sr-only">{text}</span>
        <span aria-hidden>
          {text.slice(0, shown)}
          {/* Holds the line's full height and width from the first frame, so
              the section below it does not jump as characters arrive. */}
          <span className="invisible">{text.slice(shown)}</span>
        </span>
      </div>
    </Tag>
  );
}

/**
 * A slow specular sweep across text, the way light crosses foil on a printed
 * certificate. Long loop, long pause: a material property, not a thing asking
 * to be looked at.
 *
 * The base colour has to be inside the gradient. The first version clipped a
 * transparent-to-brand-to-transparent gradient behind text that kept its own
 * colour, so the opaque glyphs covered the effect completely and it showed
 * nothing at all. Clipping only works with `text-transparent`, and with
 * `text-transparent` the gradient is the only thing painting the letters, so it
 * must carry the colour they are meant to be the rest of the time.
 *
 * Under reduced motion it renders as flat `base` colour, since a frozen sweep
 * would strand the text mid-gradient.
 */
export function Sheen({
  children,
  className,
  base = "var(--primary)",
  highlight = "var(--brand)",
}: {
  children: ReactNode;
  className?: string;
  base?: string;
  highlight?: string;
}) {
  const reduced = useReduced();

  if (reduced) {
    return (
      <span className={className} style={{ color: base }}>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className={cn("bg-clip-text text-transparent", className)}
      style={
        {
          backgroundImage: `linear-gradient(100deg, ${base} 38%, ${highlight} 50%, ${base} 62%)`,
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
        } as CSSProperties
      }
      animate={{ backgroundPositionX: ["160%", "-60%"] }}
      transition={{
        duration: 5.5,
        repeat: Infinity,
        repeatDelay: 5,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Backgrounds
// ────────────────────────────────────────────────────────────────────────────

const ORBS = [
  {
    className: "-top-40 -left-32 size-[34rem] bg-brand/25",
    animate: { x: [0, 60, -20, 0], y: [0, 30, 60, 0], scale: [1, 1.08, 0.96, 1] },
    duration: 19,
  },
  {
    className: "-top-24 right-0 size-[28rem] bg-brand-cyan/20",
    animate: { x: [0, -50, 20, 0], y: [0, 40, 10, 0], scale: [1, 0.94, 1.1, 1] },
    duration: 23,
  },
  {
    className: "hidden md:block -bottom-40 left-1/3 size-[30rem] bg-brand/15",
    animate: { x: [0, 40, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.12, 1, 1] },
    duration: 29,
  },
  {
    className: "hidden md:block -right-20 bottom-0 size-[22rem] bg-verified/10",
    animate: { x: [0, -30, 10, 0], y: [0, -20, 30, 0], scale: [1, 1.05, 0.98, 1] },
    duration: 31,
  },
];

/**
 * The ambient field behind a panel: four coloured masses drifting on long,
 * mismatched cycles.
 *
 * The durations are deliberately near-coprime (19, 23, 29, 31 seconds) so the
 * composition never visibly repeats. Matched durations produce a pulse, and a
 * pulse is what makes ambient motion read as cheap.
 */
export function AuroraField() {
  const reduced = useReduced();
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className={cn("absolute rounded-full blur-3xl", orb.className)}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1.7,
          }}
        />
      ))}
    </div>
  );
}

const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklch, var(--brand) 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--brand) 22%, transparent) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage:
    "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)",
} as CSSProperties;

/**
 * A faint engineering grid, drifting exactly one cell per cycle so the loop is
 * seamless. Masked towards the edges so it reads as texture under the content
 * rather than as a box the content sits inside.
 */
export function GridField({ className }: { className?: string }) {
  const reduced = useReduced();
  const base = cn(
    "pointer-events-none absolute inset-0 -z-10 opacity-40",
    className,
  );

  if (reduced) return <div aria-hidden className={base} style={GRID_STYLE} />;

  return (
    <motion.div
      aria-hidden
      className={base}
      style={GRID_STYLE}
      animate={{ backgroundPositionX: [0, 56], backgroundPositionY: [0, 56] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
  );
}

/**
 * Film grain, as a still SVG turbulence tile.
 *
 * Deliberately not animated. Moving grain is a genuine photosensitivity
 * trigger and forces a full repaint of everything beneath it; a still tile
 * costs one rasterise and does the same job of taking the plastic sheen off
 * large flat areas of colour.
 */
export function Grain({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-overlay",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

/**
 * The page-wide ambient background: drifting colour, a faint grid, grain, and a
 * light that follows the cursor anywhere on the page.
 *
 * Fixed to the viewport rather than to the document, which is the whole trick.
 * An absolutely positioned layer would scroll away and the glow would drift off
 * the top of a long page; fixed keeps it under the pointer wherever the reader
 * has got to, and costs one composited layer instead of one per section.
 *
 * The pointer listener is on `window` and passive, and it writes to motion
 * values, so moving the mouse repaints a single gradient and re-renders nothing.
 * It is registered only where `useRichMotion` says the device can afford it:
 * there is no cursor to follow on a phone, and a fixed full-viewport gradient
 * repainting behind a scrolling page is exactly the sort of thing that costs
 * frames on mid-range hardware.
 *
 * The drifting colour and the grid still run on mobile, at a reduced orb count,
 * because those animate transforms on their own layer and cost almost nothing.
 */
export function PageAmbience() {
  const reduced = useReduced();
  const rich = useRichMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const background = useMotionTemplate`radial-gradient(600px circle at ${x}px ${y}px, color-mix(in oklch, var(--brand) 10%, transparent), transparent 65%)`;

  useEffect(() => {
    if (!rich) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [rich, x, y]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <AuroraField />
      <GridField className="opacity-25" />
      {rich && (
        <motion.div className="absolute inset-0" style={{ background }} />
      )}
      <Grain className="opacity-[0.1]" />
    </div>
  );
}

/**
 * A panel with a soft light that follows the pointer across it.
 *
 * This owns the wrapper rather than being dropped inside one, so the listeners
 * live and die with the component instead of being attached to a parent node
 * found at ref time and never removed. Pointer position is written to motion
 * values, so moving the mouse repaints one gradient and re-renders no React.
 *
 * Touch pointers are ignored: there is nothing to follow, and reacting would
 * park the glow wherever the last tap happened to land.
 */
export function SpotlightPanel({
  children,
  className,
  radius = 420,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
}) {
  const rich = useRichMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, color-mix(in oklch, var(--brand) 13%, transparent), transparent 70%)`;

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={(e) => {
        if (!rich || e.pointerType === "touch") return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onPointerLeave={() => {
        x.set(-9999);
        y.set(-9999);
      }}
    >
      {rich && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background }}
        />
      )}
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Scroll
// ────────────────────────────────────────────────────────────────────────────

/** A hairline of brand colour across the top, tracking read position. */
export function ScrollProgress() {
  const reduced = useReduced();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand"
      style={{ scaleX }}
    />
  );
}

/**
 * Moves a child against the scroll by `distance` pixels as it crosses the
 * viewport. Small numbers only: this is depth, not travel.
 */
export function Parallax({
  children,
  distance = 40,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const rich = useRichMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 90, damping: 26, restDelta: 0.5 });

  return (
    <div ref={ref} className={className}>
      {rich ? <motion.div style={{ y }}>{children}</motion.div> : children}
    </div>
  );
}

/**
 * The hero settling as the reader leaves it: a little lift and a touch of
 * fade, so scrolling past reads as depth rather than as a block sliding off.
 */
export function HeroScrollFade({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rich = useRichMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.4]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.975]);

  if (!rich) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ opacity, scale }}>
      {children}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Elements
// ────────────────────────────────────────────────────────────────────────────

/**
 * A card that lights up under the pointer, the glow tracking it across the
 * surface.
 *
 * The glow sits above the card's own background and below its content, which
 * is why this cannot just reuse `SpotlightPanel`: that one paints at `-z-10`,
 * behind an opaque `bg-card`, where nothing would ever see it.
 */
export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rich = useRichMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const background = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, color-mix(in oklch, var(--brand) 14%, transparent), transparent 65%)`;

  return (
    <div
      ref={ref}
      className={cn("group relative overflow-hidden", className)}
      onPointerMove={(e) => {
        if (!rich || e.pointerType === "touch") return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onPointerLeave={() => {
        x.set(-9999);
        y.set(-9999);
      }}
    >
      {rich && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background }}
        />
      )}
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

/**
 * A card that starts pulled toward the centre of its grid and settles into
 * place as the section is scrolled through.
 *
 * The offset is driven by scroll position rather than fired once on entry, so
 * the four cards visibly converge and separate as the reader moves, instead of
 * playing an animation at them. `fromX` and `fromY` say where this card starts
 * relative to where it belongs: the two left cards come from the right, the two
 * right cards from the left, so the set opens outwards from the middle.
 *
 * Desktop only, via `useRichMotion`. This is scroll-linked work on every frame,
 * which is the thing that stutters on a mid-range phone, and on a narrow screen
 * the grid is one column anyway so there is no middle to come from. Everywhere
 * else the cards are simply in position, which is what they were before.
 */
export function ConvergeCard({
  children,
  className,
  fromX = 0,
  fromY = 0,
}: {
  children: ReactNode;
  className?: string;
  fromX?: number;
  fromY?: number;
}) {
  const rich = useRichMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rawX = useTransform(scrollYProgress, [0, 1], [fromX, 0]);
  const rawY = useTransform(scrollYProgress, [0, 1], [fromY, 0]);
  const rawScale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.45], [0, 1]);

  const spring = { stiffness: 110, damping: 24, restDelta: 0.5 };
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);
  const scale = useSpring(rawScale, spring);

  if (!rich) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ x, y, scale, opacity }}>
      {children}
    </motion.div>
  );
}

/** A gentle, endless float. For the pills orbiting the credential card. */
export function Float({
  children,
  className,
  amplitude = 6,
  duration = 5,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const reduced = useReduced();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A number that counts up the first time it is scrolled to.
 *
 * The animating digits are hidden from assistive technology and the real value
 * is given once as text, for the same reason as the exam result's counter: a
 * screen reader announcing every frame of a count is unusable.
 */
export function CountUpOnView({
  to,
  className,
  duration = 1.4,
  pad = 0,
}: {
  to: number;
  className?: string;
  duration?: number;
  /** Zero-pad to this width, for sequence numbers rendered as 01, 02, 03. */
  pad?: number;
}) {
  const reduced = useReduced();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const value = useMotionValue(0);
  const format = (v: number) =>
    pad > 0
      ? String(Math.round(v)).padStart(pad, "0")
      : Math.round(v).toLocaleString();
  const text = useTransform(value, format);

  useEffect(() => {
    if (reduced || !inView) return;
    const controls = animate(value, to, { duration, ease: EASE });
    return () => controls.stop();
  }, [inView, reduced, to, duration, value]);

  return (
    <span ref={ref} className={className}>
      {reduced ? (
        format(to)
      ) : (
        <>
          <motion.span aria-hidden>{text}</motion.span>
          <span className="sr-only">{format(to)}</span>
        </>
      )}
    </span>
  );
}

/**
 * An endless horizontal run of items.
 *
 * A CSS animation rather than a motion one, and that is the point: CSS is what
 * `animation-play-state` can pause on hover, so somebody who notices an item
 * can stop and read it. It also runs off the main thread and needs no
 * JavaScript at all. `gn-marquee` and the reduced-motion guard live in
 * globals.css.
 *
 * The row is rendered twice and travels exactly -50% of the track, which is
 * what makes the seam invisible: at the end of the cycle the second copy sits
 * precisely where the first began.
 */
export function Marquee({
  items,
  className,
  duration = 38,
}: {
  items: string[];
  className?: string;
  duration?: number;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className,
      )}
    >
      <div
        className="gn-marquee flex w-max group-hover:[animation-play-state:paused]"
        style={{ "--gn-marquee-duration": `${duration}s` } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center gap-10 pr-10"
          >
            {items.map((item) => (
              <li
                key={item}
                className="flex shrink-0 items-center gap-3 text-sm whitespace-nowrap text-muted-foreground"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full bg-brand"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
