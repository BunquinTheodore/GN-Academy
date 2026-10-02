/**
 * three@0.186 ships no type declarations and @types/three is not installed
 * (this change may not add dependencies). This shorthand declaration keeps
 * `import * as THREE from "three"` compiling, with everything typed `any`.
 * Delete this file once @types/three is added to devDependencies.
 */
declare module "three";
