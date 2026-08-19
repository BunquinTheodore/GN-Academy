"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { completeLessonAction } from "./actions";

/**
 * Calls the server action, then navigates itself. See the action for why the
 * navigation does not happen server-side.
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const { nextHref } = await completeLessonAction(lessonId);
        if (isFreeTrack && !isDone) track("free_lesson_completed");
        router.push(nextHref);
        // The lesson list and progress bar on the courses page are cached.
        router.refresh();
      } catch {
        setError("Couldn't save your progress. Check your connection and try again.");
      }
    });
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
