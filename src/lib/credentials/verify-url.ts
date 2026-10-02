/**
 * Public verification URL for a credential code. Trims trailing slashes from
 * the origin and encodes the code, matching src/app/verify/[code]/page.tsx.
 */
export function buildVerifyUrl(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/verify/${encodeURIComponent(code)}`;
}
