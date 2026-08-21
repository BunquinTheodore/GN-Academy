import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { env } from "@/lib/env";
import { site } from "@/content/site";
import { AnalyticsScript } from "@/components/analytics-script";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
      >
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
