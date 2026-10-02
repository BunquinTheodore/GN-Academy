import type { MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The primary sign-up / enroll call to action: bright brand glass with a
 * continuous shine sweep. All visual treatment lives in `.sign-up-cta` in
 * `globals.css` (it reuses the house `.gn-shine` sweep), so this stays a thin,
 * server-safe link with no client JavaScript.
 *
 * `overflow-hidden` is required: the shine pseudo-element is oversized on
 * purpose and would otherwise bleed out as a streak across neighbouring content.
 */
export type SignUpCtaSize = "md" | "lg";

export interface SignUpCtaProps {
  href: string;
  children?: ReactNode;
  size?: SignUpCtaSize;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const DEFAULT_SIGN_UP_LABEL = "Get started free";

const SIZE_CLASSES: Record<SignUpCtaSize, string> = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-7 text-base",
};

export function SignUpCta({
  href,
  children = DEFAULT_SIGN_UP_LABEL,
  size = "lg",
  className,
  onClick,
}: SignUpCtaProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "sign-up-cta gn-shine relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold whitespace-nowrap",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
