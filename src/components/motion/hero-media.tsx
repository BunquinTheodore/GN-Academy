"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The hero's moving portrait: a short silent loop, with a still poster
 * everywhere the loop should not play.
 *
 * The video is mounted only after the client has confirmed this is a large
 * screen with a fine pointer and no reduced-motion preference. That gate is not
 * about taste, it is about the 0.8 MB: this audience is largely on mobile data,
 * and a phone that renders the hero at all would otherwise pay for a video
 * inside a `hidden lg:block` container it can never see. `display: none` is not
 * a reliable way to stop a browser fetching media, so the element simply does
 * not exist until it is wanted.
 *
 * Autoplay only works muted and inline, and both are correct here anyway: sound
 * nobody asked for on a landing page is hostile, and `playsInline` stops iOS
 * throwing the clip into its native fullscreen player.
 *
 * The poster is a real frame from the same clip, so the swap from still to
 * moving is invisible rather than a jump between two different scenes.
 */
export function HeroMedia({ className }: { className?: string }) {
  const reduced = useReducedMotion() === true;
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (reduced) {
      setPlay(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const update = () => setPlay(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduced]);

  if (!play) {
    return (
      <Image
        src="/landing/hero-loop-poster.jpg"
        alt="A woman working at a laptop."
        fill
        priority
        sizes="(min-width: 1024px) 21rem, 1px"
        className={className}
      />
    );
  }

  return (
    <video
      className={className}
      src="/landing/hero-loop.mp4"
      poster="/landing/hero-loop-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      // Decorative: the still alternative carries the same alt text, and a
      // silent ten second loop of somebody typing says nothing a screen reader
      // user needs read to them.
      aria-hidden
      tabIndex={-1}
    />
  );
}
