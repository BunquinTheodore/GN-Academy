"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Counts a score up from zero.
 *
 * The result screen is the moment the whole product builds to, and the number
 * on it simply appeared, fully formed, the instant the page rendered. Counting
 * it up gives the reveal a beat, and it costs nothing: the value is already
 * decided on the server before this ever runs.
 *
 * Two things keep it honest. It never counts past the real score, so nobody
 * ever reads a number they did not get. And under prefers-reduced-motion it
 * renders the final value immediately, because a number flickering through
 * dozens of states is exactly what that setting exists to stop.
 *
 * The animating text is hidden from assistive technology and the real value is
 * given once on the wrapper. A screen reader announcing every frame of a
 * count-up would be unusable.
 */
export function CountUp({
  to,
  duration = 0.9,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduced ? to : 0));

  useEffect(() => {
    if (reduced) {
      setDisplay(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    // Land exactly on the real number rather than wherever rounding left it.
    controls.then(() => setDisplay(to));
    return () => controls.stop();
  }, [to, duration, reduced]);

  return (
    <span className={className}>
      {/*
        The animating number is hidden from assistive technology and the real
        one is exposed once, as ordinary text, in a visually hidden sibling.

        This was an aria-label on the wrapper, which does nothing: a bare span
        has the implicit role `generic`, ARIA prohibits a name on it, and
        browsers do not compute one. The only text node was aria-hidden, so a
        screen reader reached the end of an exam and announced the title and
        the pass line but never the score, which the plain <p>{score}</p> this
        replaced had read out perfectly well.
      */}
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{to}</span>
    </span>
  );
}
