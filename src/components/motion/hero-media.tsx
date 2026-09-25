import Image from "next/image";

/**
 * The hero's portrait: a still photo of the GN Academy community at the
 * Startup Zone event. There is no matching video clip for this scene, so
 * this is a plain static image rather than the poster/video swap used
 * previously.
 *
 * No `priority`: the caller (`page.tsx`) wraps this in a `hidden lg:block`
 * container, so on any viewport under `lg` it never paints at all, but
 * `priority` injects a `<link rel="preload">` in `<head>` regardless of that
 * CSS — the preload/eager fetch cannot see the `hidden` class. That forced a
 * needless eager fetch of this image on every mobile visit. Without
 * `priority`, `next/image` defaults to lazy loading, which (for a
 * `display: none` element) never triggers a fetch on mobile at all; on `lg`
 * and up the element is on screen at first paint, so it still loads early in
 * practice.
 */
export function HeroMedia({ className }: { className?: string }) {
  return (
    <Image
      src="/landing/hero-loop-poster.jpg"
      alt="GN Academy community and mentors at a startup event."
      fill
      sizes="(min-width: 1024px) 21rem, 1px"
      className={className}
    />
  );
}
