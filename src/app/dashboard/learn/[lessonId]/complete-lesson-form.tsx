"use client";

import { CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { completeLessonAction } from "./actions";

/**
 * The completion button is a plain server-action form; this wrapper exists
 * only so the §13 free-track event can fire from the browser. The action
 * itself stays the source of truth for progress.
 */
export function CompleteLessonForm({
  lessonId,
  isDone,
  isFreeTrack,
}: {
  lessonId: string;
  isDone: boolean;
  isFreeTrack: boolean;
}) {
  return (
    <form
      action={completeLessonAction}
      onSubmit={() => {
        if (isFreeTrack && !isDone) track("free_lesson_completed");
      }}
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <Button type="submit" className="h-11">
        {isDone ? (
          <>
            <CheckCircle2 className="size-4" aria-hidden />
            Completed — next lesson
          </>
        ) : (
          "Mark complete and continue"
        )}
      </Button>
    </form>
  );
}
