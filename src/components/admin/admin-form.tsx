"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type AdminFormState =
  | { error: string }
  /**
   * `revalidate` lists cached public paths this save invalidated, and
   * `redirectTo` is where the admin goes next. Both are handled by this
   * component rather than by the action, because a server action that calls
   * `revalidatePath` and returns state to `useActionState` never finishes its
   * transition in a production build: the action and the re-render both
   * complete on the server in well under a second, and the browser still sits
   * on a disabled "Saving…" button forever. Measured, reproduced with a single
   * call against an unrelated fully-dynamic route, and gone the moment the
   * call is removed; `next dev` hides it. A route handler has no transition to
   * hang, and navigating from the client is the same fix the lesson player
   * already uses for `redirect()`.
   */
  | { ok: string; revalidate?: string[]; redirectTo?: string }
  | null;

export type AdminFormAction = (
  prev: AdminFormState,
  formData: FormData,
) => Promise<AdminFormState>;

/**
 * The one form wrapper the whole admin area uses, so every editor reports
 * success and failure the same way. Pages stay server components and pass
 * plain inputs as children; only this shell is client-side.
 */
export function AdminForm({
  action,
  submitLabel = "Save",
  destructive = false,
  className,
  children,
}: {
  action: AdminFormAction;
  submitLabel?: string;
  destructive?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (!state || !("ok" in state)) return;

    const paths = state.revalidate;
    const purged =
      paths && paths.length > 0
        ? // Best effort: the save has already succeeded and the admin has
          // been told so. A failed purge only means the public page serves
          // its cached copy until its own revalidate window expires.
          fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths }),
          }).catch(() => {})
        : Promise.resolve();

    const destination = state.redirectTo;
    if (destination) {
      void purged.then(() => router.push(destination));
    } else {
      void purged;
    }
  }, [state, router]);

  return (
    <form action={formAction} className={cn("flex flex-col gap-4", className)}>
      {state && "error" in state && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state && "ok" in state && (
        <Alert>
          <AlertDescription>{state.ok}</AlertDescription>
        </Alert>
      )}

      {children}

      <div>
        <Button
          type="submit"
          disabled={pending}
          variant={destructive ? "destructive" : "default"}
          className="h-11"
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
