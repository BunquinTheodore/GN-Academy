import { headers } from "next/headers";

/**
 * Renders a JSON-LD `<script>` tag carrying the per-request nonce middleware
 * sets on `x-nonce`, so structured data keeps working under a CSP that has no
 * 'unsafe-inline' in script-src. CSP governs every `<script>` element
 * regardless of its `type`, JSON-LD included.
 */
export async function JsonLd({ data }: { data: object }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
