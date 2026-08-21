"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Records the lesson through a route handler, then navigates.
 *
 * Neither half is the obvious shape, and both are load-bearing. See
 * `src/app/api/lessons/[lessonId]/complete/route.ts` for why this is a plain
 * fetch instead of a server action, and why the server hands back an href
 * rather than redirecting.
 *
 * `pending` is not cleared on success: the next lesson is already being
 * navigated to, and flipping the label back first makes the button look as
 * though it did nothing.
 */
export function CompleteLessonButton({
  lessonId,
  isDone,
  isFreeTrack,
}: {
  lessonId: string;
  isDone: boolean;
  isFreeTrack: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
      });
      const body = (await response.json()) as { nextHref?: string };
      if (!response.ok || !body.nextHref) throw new Error("save failed");

      if (isFreeTrack && !isDone) track("free_lesson_completed");
      router.push(body.nextHref);
    } catch {
      setError(
        "Couldn't save your progress. Check your connection and try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        className="h-11"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? (
          "Saving…"
        ) : isDone ? (
          <>
            <CheckCircle2 className="size-4" aria-hidden />
            Completed — next lesson
          </>
        ) : (
          "Mark complete and continue"
        )}
      </Button>
    </div>
  );
}
