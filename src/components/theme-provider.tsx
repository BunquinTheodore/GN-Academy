"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme handling for the whole site.
 *
 * `attribute="class"` puts `class="dark"` on <html>, which is what the
 * `@custom-variant dark` rule in globals.css keys off. The default is the
 * visitor's own system setting rather than a choice we make for them, and
 * whatever they pick is remembered.
 */
export function ThemeProvider({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // The colour swap during a theme change looks like a flicker on a slow
      // phone if every transition animates at once.
      disableTransitionOnChange
      // next-themes injects a small inline script before hydration so the
      // right class is on <html> before first paint (no flash of the wrong
      // theme). It renders that script itself, so it has to carry the CSP
      // nonce directly rather than through <JsonLd>-style wiring.
      nonce={nonce}
    >
      {children}
    </NextThemeProvider>
  );
}
