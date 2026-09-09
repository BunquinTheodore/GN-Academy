import Image from "next/image";

/**
 * The hero's portrait: a still photo of the GN Academy community at the
 * Startup Zone event. There is no matching video clip for this scene, so
 * this is a plain static image rather than the poster/video swap used
 * previously.
 */
export function HeroMedia({ className }: { className?: string }) {
  return (
    <Image
      src="/landing/hero-loop-poster.jpg"
      alt="GN Academy community and mentors at a startup event."
      fill
      priority
      sizes="(min-width: 1024px) 21rem, 1px"
      className={className}
    />
  );
}
