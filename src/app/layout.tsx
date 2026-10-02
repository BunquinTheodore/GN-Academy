import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Josefin_Sans, Manrope, Poppins } from "next/font/google";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { AnalyticsScript } from "@/components/analytics-script";
import { ClickSoundProvider } from "@/components/click-sound-provider";
import { SiteBackground } from "@/components/site-background";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/**
 * Three faces, one job each.
 *
 * - Josefin Sans Light, rendered ALL CAPS by CSS: titles and main sections
 *   (page h1, section h2, hero). `--font-display`.
 * - Manrope: body text, lessons, descriptions, and sentence-case headings
 *   below section level (card titles, h3 and under). `--font-sans`.
 * - Poppins: interface text, meaning buttons, nav, labels, form fields,
 *   badges. `--font-ui`.
 *
 * Weights are deliberately few. The audience is largely on mobile data, so
 * Josefin ships only its 300 face (every display heading is Light), Poppins
 * only 400/500/600, and Manrope is a variable font (one file for every
 * weight). Anything that asks for a weight we did not load would be
 * synthesised by the browser, so display text must never ask for bold: the
 * display rule in globals.css pins weight 300.
 *
 * Capitals come from `text-transform: uppercase`, never from retyped copy, so
 * screen readers and copy/paste still see the real sentence.
 *
 * `display: "swap"` so a slow connection reads fallback text rather than
 * nothing. next/font also generates a size-adjusted fallback face for each
 * font, which keeps the swap from shifting the layout.
 */
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: "300",
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono marks credential codes and scores, small below-the-fold text.
  // Not worth a preload that competes with the display font for LCP.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "GN Academy: Learn. Prove. Get hired.",
    template: "%s · GN Academy",
  },
  description:
    "Practical foundations and verified credentials for Filipinos, from AI and blockchain to online safety, finance, freelancing, and career skills.",
  twitter: { card: "summary_large_image" },
};

/**
 * Sitewide issuer identity. A credential is only as credible as the body
 * that issued it, so the organisation is described once, everywhere, and
 * the credential pages point back at it.
 */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: site.name,
  url: env.NEXT_PUBLIC_SITE_URL,
  description: site.description,
  slogan: site.tagline,
  areaServed: { "@type": "Country", name: "Philippines" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // suppressHydrationWarning: next-themes sets the class on <html> before
    // React hydrates, so the server and client markup differ by design here.
    /*
      The font variables go on <html>, not <body>, and this was a real bug.

      globals.css does `html { @apply font-sans }`, which resolves to
      `var(--font-sans)` and from there to `var(--font-manrope)`. When the
      variables were declared on <body>, <html> could not see them: custom
      properties inherit down the tree, never up. So --font-sans resolved to
      nothing, the font-family declaration was invalid, and <html> fell back to
      the browser default. <body> then inherited that, because nothing sets a
      family on <body> itself.

      Measured, before the fix: getComputedStyle(document.body).fontFamily was
      "Times New Roman". Every piece of non-heading text on the site was set in
      it. Headings escaped because font-display is applied to elements inside
      <body>, where the display variable was in scope, which is exactly why
      this survived so long: the page looked deliberate rather than broken.
      The lesson stands for all three families: variables go on <html>.
    */
    <html
      lang="en"
      className={`${josefin.variable} ${manrope.variable} ${poppins.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/*
          Intro splash. Pure CSS (see .gn-splash in globals.css), outside
          {children} so a next/link navigation between routes never remounts
          it, aria-hidden because it is decorative and never the real content.
        */}
        <div className="gn-splash" aria-hidden="true">
          <span className="gn-splash-title">GN Academy</span>
        </div>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <ThemeProvider nonce={nonce}>
          {/*
            Sitewide background, mounted once so route changes never restart
            it. Fixed at -z-10, so it sits under all content and under
            .gn-splash (z-index 9999). Inside ThemeProvider because it reads
            the resolved theme. Renders null on app, auth and player routes.
          */}
          <SiteBackground />
          {children}
        </ThemeProvider>
        <AnalyticsScript nonce={nonce} />
        <ClickSoundProvider />
      </body>
    </html>
  );
}
