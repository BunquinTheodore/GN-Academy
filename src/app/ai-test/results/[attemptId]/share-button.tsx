"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My AI Readiness score", url });
        return;
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing sensible to do
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-11"
      onClick={() => void onShare()}
    >
      {copied ? (
        <>
          <Check className="size-4" aria-hidden />
          Link copied
        </>
      ) : (
        <>
          <Link2 className="size-4" aria-hidden />
          Share my result
        </>
      )}
    </Button>
  );
}
