/**
 * Tells a caller whether a visitor has recently used the page.
 *
 * Why it exists: an always-running canvas costs main-thread time, and a
 * PageSpeed or Lighthouse run never touches the page, so anything that starts
 * on first input can never end up in that measurement, while a real visitor
 * still gets it a moment after they move the mouse or touch the screen.
 *
 * The gate reports `true` on the first real input, stays `true` while input
 * keeps arriving, and reports `false` again after `timeoutMs` without any (so
 * the caller can stop its animation entirely); the next input wakes it.
 * A scroll only counts once the page has actually moved, because browsers
 * fire scroll events for restored positions and anchor jumps.
 */

const INPUT_EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel"] as const;
const SCROLL_THRESHOLD_PX = 24;

export interface InputActivityGateOptions {
  readonly target: EventTarget;
  readonly timeoutMs: number;
  readonly onChange: (active: boolean) => void;
  /** Where the page is scrolled to. Defaults to window.scrollY. */
  readonly readScrollY?: () => number;
}

export interface InputActivityGate {
  dispose: () => void;
}

function defaultReadScrollY(): number {
  return typeof window === "undefined" ? 0 : window.scrollY;
}

export function createInputActivityGate(options: InputActivityGateOptions): InputActivityGate {
  const { target, timeoutMs, onChange } = options;
  const readScrollY = options.readScrollY ?? defaultReadScrollY;

  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let baselineScrollY = readScrollY();

  const goInactive = () => {
    active = false;
    baselineScrollY = readScrollY();
    onChange(false);
  };

  const markActive = () => {
    if (!active) {
      active = true;
      onChange(true);
    }
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(goInactive, timeoutMs);
  };

  const onInput = () => markActive();

  const onScroll = () => {
    if (Math.abs(readScrollY() - baselineScrollY) < SCROLL_THRESHOLD_PX) return;
    markActive();
  };

  for (const type of INPUT_EVENTS) target.addEventListener(type, onInput, { passive: true });
  target.addEventListener("scroll", onScroll, { passive: true });

  return {
    dispose() {
      for (const type of INPUT_EVENTS) target.removeEventListener(type, onInput);
      target.removeEventListener("scroll", onScroll);
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
