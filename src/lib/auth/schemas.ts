import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password needs at least 8 characters."),
  marketingConsent: z.boolean(),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const resetSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetInput = z.infer<typeof resetSchema>;

/**
 * §12: never redirect to a caller-supplied absolute URL. Only same-origin
 * pathnames survive; anything else falls back.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const PARSE_BASE = "http://x.invalid";

export function safeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof value !== "string" || !value) return fallback;
  // Tabs and newlines are stripped by WHATWG URL parsing, so "/\t/evil.com"
  // would reach the browser as "//evil.com". Reject control characters and
  // backslashes outright, then confirm the parsed origin did not change.
  if (CONTROL_CHARS.test(value) || value.includes("\\")) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, PARSE_BASE);
    if (url.origin !== PARSE_BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
