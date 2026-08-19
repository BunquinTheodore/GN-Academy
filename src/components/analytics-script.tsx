import Script from "next/script";
import {
  ANALYTICS_SRC,
  ANALYTICS_WEBSITE_ID,
  analyticsEnabled,
} from "@/lib/analytics";

/**
 * Renders nothing at all until both analytics env vars are set, so a
 * deployment without them ships zero third-party bytes — no stub, no
 * blocked request, no console noise.
 */
export function AnalyticsScript() {
  if (!analyticsEnabled) return null;

  return (
    <Script
      src={ANALYTICS_SRC}
      data-website-id={ANALYTICS_WEBSITE_ID}
      strategy="afterInteractive"
      // Never let the beacon compete with the LCP font or the first paint.
      defer
    />
  );
}
