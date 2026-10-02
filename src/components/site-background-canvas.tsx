"use client";

// The package root (`@designcodeio/threeui`) re-exports every component,
// including ones that use webpack asset modules Next's production build cannot
// compile (the production build failed on its Gallery component). The package
// `exports` map also forbids deep imports, so this file is reached through the
// `@threeui/data-pixel-arc` alias in tsconfig.json. It imports only React and
// its own renderer. The version is pinned to 1.2.0 in package.json for that reason.
import { DataPixelArcCanvas } from "@threeui/data-pixel-arc";
import "@designcodeio/threeui/style.css";

/**
 * The lazy chunk. Kept in its own file so the library and its stylesheet
 * (about 70 KB, mostly an embedded font for other components) only ever load
 * through next/dynamic from site-background.tsx. The stylesheet is fully
 * namespaced (.threeui-*, component-prefixed classes) so it cannot restyle
 * the rest of the site.
 */
export default function SiteBackgroundCanvas({
  mode,
}: {
  mode: "dark" | "light";
}) {
  return (
    <DataPixelArcCanvas
      mode={mode}
      speed={1.0}
      hue={0}
      saturation={1.0}
      brightness={1.0}
    />
  );
}
