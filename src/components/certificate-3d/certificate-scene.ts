import * as THREE from "three";

import { observeActivity } from "./activity";
import type { FaceCanvases } from "./certificate-face";
import {
  PAPER_HEIGHT,
  PAPER_WIDTH,
  SHADOW_REST,
  createPaperRig,
  type PaperRig,
  type ThreeObject,
} from "./paper-rig";
import {
  REST_POSE,
  clamp,
  clampPose,
  dragToPose,
  lightFromPointer,
  stepInertia,
  type Light,
  type Pose,
} from "./rotation-math";

const FOV_DEG = 30;
const FRAME_MARGIN = 1.18;
const MAX_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 0.05;
const LIGHT_EASE_PER_SEC = 8;
const LIGHT_SETTLED = 0.002;
const RELEASE_HOLD_MS = 90;
const REST_LIGHT: Light = lightFromPointer(0, 0);

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  faces: FaceCanvases;
  reducedMotion: boolean;
  onContextLost?: () => void;
  onContextRestored?: () => void;
};

export type SceneHandle = {
  nudge: (delta: Pose) => void;
  reset: () => void;
  dispose: () => void;
};

function easeLight(current: Light, target: Light, dt: number): Light {
  const k = 1 - Math.exp(-LIGHT_EASE_PER_SEC * dt);
  return {
    x: current.x + (target.x - current.x) * k,
    y: current.y + (target.y - current.y) * k,
    z: current.z + (target.z - current.z) * k,
  };
}

function lightSettled(a: Light, b: Light): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < LIGHT_SETTLED;
}

/** Camera distance at which the whole sheet, tilted, fits the viewport. */
function fitCamera(camera: ThreeObject, width: number, height: number) {
  const aspect = width / Math.max(height, 1);
  const halfFov = THREE.MathUtils.degToRad(FOV_DEG / 2);
  const forHeight = PAPER_HEIGHT / 2 / Math.tan(halfFov);
  const forWidth = PAPER_WIDTH / 2 / (Math.tan(halfFov) * aspect);
  camera.aspect = aspect;
  camera.position.z = Math.max(forHeight, forWidth) * FRAME_MARGIN;
  camera.updateProjectionMatrix();
}

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/**
 * Builds the renderer, scene, pointer interaction and render loop.
 * Throws if WebGL cannot start; the caller turns that into the flat fallback.
 */
export function createCertificateScene(options: SceneOptions): SceneHandle {
  const { canvas, container, faces, reducedMotion } = options;
  const renderer = createRenderer(canvas);
  let rig: PaperRig;
  try {
    rig = createPaperRig(faces, Math.min(4, renderer.capabilities.getMaxAnisotropy()));
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 20);

  let pose: Pose = REST_POSE;
  let velocity: Pose = REST_POSE;
  let light: Light = REST_LIGHT;
  let lightTarget: Light = REST_LIGHT;
  let dragging = false;
  let lastPointer = { x: 0, y: 0, t: 0 };
  let active = true;
  let lost = false;
  let frameId = 0;
  let lastFrame = performance.now();

  const apply = (now: number) => {
    const float = reducedMotion || dragging ? 0 : 1;
    rig.group.rotation.set(
      pose.pitch + Math.sin(now * 0.0009) * 0.02 * float,
      pose.yaw + Math.sin(now * 0.0007) * 0.03 * float,
      0,
    );
    rig.group.position.y = Math.sin(now * 0.0012) * 0.015 * float;
    rig.shadow.position.set(-pose.yaw * 0.3, SHADOW_REST.y + pose.pitch * 0.25, SHADOW_REST.z);
    rig.shadow.material.opacity = 1 - 0.25 * Math.abs(pose.yaw);
    rig.keyLight.position.set(light.x, light.y, light.z);
  };

  const frame = (now: number) => {
    frameId = 0;
    const dt = clamp((now - lastFrame) / 1000, 0, MAX_FRAME_SECONDS);
    lastFrame = now;
    if (!dragging && !reducedMotion) {
      const next = stepInertia(pose, velocity, dt);
      pose = next.pose;
      velocity = next.velocity;
    }
    light = reducedMotion ? lightTarget : easeLight(light, lightTarget, dt);
    apply(now);
    renderer.render(rig.scene, camera);
    const moving = velocity.yaw !== 0 || velocity.pitch !== 0;
    if (!reducedMotion || moving || !lightSettled(light, lightTarget)) schedule();
  };

  function schedule() {
    if (frameId || !active || lost) return;
    frameId = requestAnimationFrame(frame);
  }

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    fitCamera(camera, w, h);
    // setSize clears the drawing buffer. Paint straight away instead of
    // waiting for requestAnimationFrame: browsers pause rAF in background or
    // occluded tabs, which left the canvas blank (an empty glass frame).
    if (!lost) {
      apply(performance.now());
      renderer.render(rig.scene, camera);
    }
    schedule();
  };

  const toNormalized = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      nx: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      ny: ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1,
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    dragging = true;
    velocity = REST_POSE;
    lastPointer = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    canvas.setPointerCapture(event.pointerId);
    schedule();
  };

  const onPointerMove = (event: PointerEvent) => {
    const { nx, ny } = toNormalized(event);
    lightTarget = lightFromPointer(nx, ny);
    if (dragging) {
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const dtSec = Math.max((event.timeStamp - lastPointer.t) / 1000, 0.001);
      const before = pose;
      pose = dragToPose(pose, dx, dy, canvas.clientWidth);
      velocity = clampPose({
        yaw: (pose.yaw - before.yaw) / dtSec,
        pitch: (pose.pitch - before.pitch) / dtSec,
      });
      lastPointer = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    }
    schedule();
  };

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    const held = event.timeStamp - lastPointer.t > RELEASE_HOLD_MS;
    if (reducedMotion || held) velocity = REST_POSE;
    schedule();
  };

  const onPointerLeave = () => {
    if (dragging) return;
    lightTarget = REST_LIGHT;
    schedule();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
    options.onContextLost?.();
  };

  const onContextRestored = () => {
    lost = false;
    options.onContextRestored?.();
    schedule();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const stopActivity = observeActivity(container, (isActive) => {
    active = isActive;
    if (isActive) {
      lastFrame = performance.now();
      schedule();
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  });
  resize();

  return {
    nudge: (delta) => {
      pose = clampPose({ yaw: pose.yaw + delta.yaw, pitch: pose.pitch + delta.pitch });
      schedule();
    },
    reset: () => {
      pose = REST_POSE;
      velocity = REST_POSE;
      lightTarget = REST_LIGHT;
      schedule();
    },
    dispose: () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
      active = false;
      stopActivity();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
