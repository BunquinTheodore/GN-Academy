"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type AdminFormState = { error: string } | { ok: string } | null;

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
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    null,
  );

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
