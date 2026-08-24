import type { Metadata } from "next";
import { Inter, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { AnalyticsScript } from "@/components/analytics-script";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/**
 * Inter for the interface, Bricolage Grotesque for display.
 *
 * This was Geist. The swap is about legibility at the sizes this product
 * actually reads at: Inter was drawn for screen UI and holds up better in the
 * long stretches of body text a course lesson is made of. It is also already
 * in the repo, embedded in the certificate PDF, so the certificate and the
 * site now use the same face instead of two that merely look similar.
 *
 * `display: "swap"` so a slow connection reads fallback text rather than
 * nothing. The audience is largely on mobile data.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono marks credential codes and scores — small, below-the-fold text.
  // Not worth a preload that competes with the display font for LCP.
  preload: false,
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "GN Academy: Learn. Prove. Get hired.",
    template: "%s · GN Academy",
  },
  description:
    "Professional AI certification for Filipinos. Take the free AI Readiness Test, earn a verified credential, and get found by employers.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the class on <html> before
    // React hydrates, so the server and client markup differ by design here.
    /*
      The font variables go on <html>, not <body>, and this was a real bug.

      globals.css does `html { @apply font-sans }`, which resolves to
      `var(--font-sans)` and from there to `var(--font-inter)`. When the
      variables were declared on <body>, <html> could not see them: custom
      properties inherit down the tree, never up. So --font-sans resolved to
      nothing, the font-family declaration was invalid, and <html> fell back to
      the browser default. <body> then inherited that, because nothing sets a
      family on <body> itself.

      Measured, before the fix: getComputedStyle(document.body).fontFamily was
      "Times New Roman". Every piece of non-heading text on the site was set in
      it. Headings escaped because font-display is applied to elements inside
      <body>, where --font-bricolage is in scope, which is exactly why this
      survived so long: the page looked deliberate rather than broken.
    */
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <AnalyticsScript />
      </body>
    </html>
  );
}
