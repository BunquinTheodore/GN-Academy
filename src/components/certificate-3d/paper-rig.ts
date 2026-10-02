import * as THREE from "three";

import { FACE_HEIGHT, FACE_WIDTH, type FaceCanvases } from "./certificate-face";

/** Paper size in scene units; the sheet is 1 unit tall. */
export const PAPER_WIDTH = FACE_WIDTH / FACE_HEIGHT;
export const PAPER_HEIGHT = 1;

/** Half the gap between the two faces, which reads as paper thickness. */
const HALF_THICKNESS = 0.004;
const SHADOW_Y = -0.07;
const SHADOW_Z = -0.45;

/** Anything three.js can free: geometry, material, texture. */
type Disposable = { dispose: () => void };

/**
 * three ships no types here (see three-module.d.ts), so its objects are `any`.
 * One alias keeps the lint suppression in a single place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreeObject = any;

export type PaperRig = {
  scene: ThreeObject;
  group: ThreeObject;
  shadow: ThreeObject;
  keyLight: ThreeObject;
  dispose: () => void;
};

function makeTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Paper look without the cost of real transmission (which renders the scene a
 * second time): a slightly transparent physical material with sheen for the
 * fibre glow, a thin clearcoat for the highlight that follows the cursor, and
 * a touch of emissive so text stays legible at steep angles.
 */
function paperMaterial(map: unknown) {
  return new THREE.MeshPhysicalMaterial({
    map,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.55,
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xffffff),
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: map,
    emissiveIntensity: 0.12,
  });
}

function addLights(scene: ThreeObject) {
  const fill = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(0, 0, 2.4);
  const rim = new THREE.DirectionalLight(0xffffff, 0.4);
  rim.position.set(-2, -1, 2);
  scene.add(fill, keyLight, rim);
  return keyLight;
}

function buildFaces(canvases: FaceCanvases, anisotropy: number, own: Disposable[]) {
  const geometry = new THREE.PlaneGeometry(PAPER_WIDTH, PAPER_HEIGHT);
  const frontMap = makeTexture(canvases.front, anisotropy);
  const backMap = makeTexture(canvases.back, anisotropy);
  const frontMaterial = paperMaterial(frontMap);
  const backMaterial = paperMaterial(backMap);
  own.push(geometry, frontMap, backMap, frontMaterial, backMaterial);

  const front = new THREE.Mesh(geometry, frontMaterial);
  front.position.z = HALF_THICKNESS;
  const back = new THREE.Mesh(geometry, backMaterial);
  back.position.z = -HALF_THICKNESS;
  back.rotation.y = Math.PI;
  return [front, back];
}

function buildShadow(canvas: HTMLCanvasElement, own: Disposable[]) {
  const map = makeTexture(canvas, 1);
  const geometry = new THREE.PlaneGeometry(PAPER_WIDTH * 1.55, PAPER_HEIGHT * 1.55);
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
  });
  own.push(map, geometry, material);
  const shadow = new THREE.Mesh(geometry, material);
  shadow.position.set(0, SHADOW_Y, SHADOW_Z);
  return shadow;
}

/** Everything in the scene, plus one function that frees all of it. */
export function createPaperRig(canvases: FaceCanvases, anisotropy: number): PaperRig {
  const own: Disposable[] = [];
  const scene = new THREE.Scene();
  const keyLight = addLights(scene);
  const group = new THREE.Group();
  group.add(...buildFaces(canvases, anisotropy, own));
  const shadow = buildShadow(canvases.shadow, own);
  scene.add(shadow, group);
  return {
    scene,
    group,
    shadow,
    keyLight,
    dispose: () => own.forEach((item) => item.dispose()),
  };
}

export const SHADOW_REST = { y: SHADOW_Y, z: SHADOW_Z } as const;
