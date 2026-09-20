let audioCtx: AudioContext | null = null;

/**
 * Synthesized rather than an audio file -- a short click needs no asset to
 * fetch/cache, and this is the entire "sound library" the site needs.
 * AudioContext is created lazily (browsers block it until a real user
 * gesture anyway, which a click always satisfies) and reused across calls.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

/**
 * A short, dry UI click -- a brief sine tick with a fast exponential decay,
 * pitched a touch higher than the note it decays from so it reads as a
 * "tap" rather than a musical note. ~50ms total, well under the threshold
 * where a sound starts to feel like latency rather than feedback.
 */
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}
