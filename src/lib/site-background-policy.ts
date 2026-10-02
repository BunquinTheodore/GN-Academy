/**
 * Pure decision logic for the sitewide background.
 *
 * "none"     : render nothing (app, auth and player routes)
 * "static"   : render the CSS gradient only (reduced motion, Save-Data,
 *              low-end device)
 * "animated" : lazy-load the canvas animation
 */
export type SiteBackgroundMode = "animated" | "static" | "none";

export interface BackgroundCapabilities {
  readonly reducedMotion: boolean;
  readonly saveData: boolean;
  /** navigator.deviceMemory in GB, undefined where unsupported. */
  readonly deviceMemory: number | undefined;
  readonly hardwareConcurrency: number | undefined;
}

/** Route prefixes where legibility and performance matter more than flair. */
const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/api",
] as const;

const LOW_MEMORY_GB = 2;
const LOW_CORE_COUNT = 2;

function isExcluded(pathname: string): boolean {
  const path =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isLowEnd(caps: BackgroundCapabilities): boolean {
  const { deviceMemory, hardwareConcurrency } = caps;
  return (
    (deviceMemory !== undefined && deviceMemory <= LOW_MEMORY_GB) ||
    (hardwareConcurrency !== undefined &&
      hardwareConcurrency <= LOW_CORE_COUNT)
  );
}

export function decideSiteBackground(
  pathname: string | null,
  caps: BackgroundCapabilities,
): SiteBackgroundMode {
  if (pathname === null || isExcluded(pathname)) return "none";
  if (caps.reducedMotion || caps.saveData || isLowEnd(caps)) return "static";
  return "animated";
}
