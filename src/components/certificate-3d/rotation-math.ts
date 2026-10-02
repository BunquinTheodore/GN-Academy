/**
 * Pure pose and light math for the 3D certificate. Angles are radians.
 * Every function returns a new object; nothing is mutated.
 */

export type Pose = { readonly yaw: number; readonly pitch: number };
export type Light = { readonly x: number; readonly y: number; readonly z: number };

export const MAX_YAW = 0.95;
export const MAX_PITCH = 0.55;

/** Radians of yaw for dragging across the full width of the viewer. */
const DRAG_SWEEP = 2.4;
/** Per-second exponential decay of release velocity. */
const INERTIA_DECAY = 4.5;
const VELOCITY_FLOOR = 0.01;
const KEY_STEP = 0.18;

export const REST_POSE: Pose = { yaw: 0, pitch: 0 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampPose(pose: Pose): Pose {
  return {
    yaw: clamp(pose.yaw, -MAX_YAW, MAX_YAW),
    pitch: clamp(pose.pitch, -MAX_PITCH, MAX_PITCH),
  };
}

/** Applies a pointer drag of (dx, dy) px, relative to the viewer width. */
export function dragToPose(
  pose: Pose,
  dxPx: number,
  dyPx: number,
  sizePx: number,
): Pose {
  const scale = DRAG_SWEEP / Math.max(sizePx, 1);
  return clampPose({
    yaw: pose.yaw + dxPx * scale,
    pitch: pose.pitch + dyPx * scale,
  });
}

/** One inertia step. Velocity is rad/s and dies at the clamp or the floor. */
export function stepInertia(
  pose: Pose,
  velocity: Pose,
  dtSec: number,
): { pose: Pose; velocity: Pose } {
  const decay = Math.exp(-INERTIA_DECAY * dtSec);
  const moved = {
    yaw: pose.yaw + velocity.yaw * dtSec,
    pitch: pose.pitch + velocity.pitch * dtSec,
  };
  const next = clampPose(moved);
  const settle = (v: number, hitClamp: boolean): number => {
    const decayed = v * decay;
    return hitClamp || Math.abs(decayed) < VELOCITY_FLOOR ? 0 : decayed;
  };
  return {
    pose: next,
    velocity: {
      yaw: settle(velocity.yaw, next.yaw !== moved.yaw),
      pitch: settle(velocity.pitch, next.pitch !== moved.pitch),
    },
  };
}

/** Arrow key to a pose delta, or null for keys we do not handle. */
export function keyToNudge(key: string): Pose | null {
  switch (key) {
    case "ArrowLeft":
      return { yaw: -KEY_STEP, pitch: 0 };
    case "ArrowRight":
      return { yaw: KEY_STEP, pitch: 0 };
    case "ArrowUp":
      return { yaw: 0, pitch: -KEY_STEP };
    case "ArrowDown":
      return { yaw: 0, pitch: KEY_STEP };
    default:
      return null;
  }
}

/** Key light position for a pointer at normalized (-1..1, screen-down) coords. */
export function lightFromPointer(nx: number, ny: number): Light {
  return {
    x: clamp(nx, -1, 1) * 2.2,
    y: -clamp(ny, -1, 1) * 1.6,
    z: 2.4,
  };
}
