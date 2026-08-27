"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const COUNTER_LINK: Record<string, { label: string; href: string }> = {
  "/login": { label: "Create account", href: "/signup" },
  "/signup": { label: "Log in", href: "/login" },
  "/forgot-password": { label: "Log in", href: "/login" },
};

/** The pill link in the top-right corner of every auth page, pointing at
 * whichever other auth page makes sense from here. */
export function AuthTopBar() {
  const pathname = usePathname();
  const link = COUNTER_LINK[pathname];
  if (!link) return null;

  return (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={link.href}>
        <ArrowLeft className="size-3.5" aria-hidden />
        {link.label}
      </Link>
    </Button>
  );
}
