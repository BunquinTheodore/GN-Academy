"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No raw stack traces reach the user (§12); log for diagnostics only.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold">
        Something broke on our side
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page hit an error and couldn&apos;t load. Your work is saved where
        possible. Try again, and if it keeps failing, come back in a few
        minutes.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
