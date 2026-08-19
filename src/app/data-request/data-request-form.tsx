"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitDataRequestAction,
  type DataRequestState,
} from "./actions";

const KINDS = [
  {
    value: "access",
    label: "Show me my data",
    hint: "A copy of everything we hold about you.",
  },
  {
    value: "correction",
    label: "Correct my data",
    hint: "Something we hold about you is wrong.",
  },
  {
    value: "deletion",
    label: "Delete my account and data",
    hint: "Permanent. Credentials you earned stay verifiable but stop being linked to you.",
  },
] as const;

export function DataRequestForm() {
  const [state, formAction, pending] = useActionState<
    DataRequestState,
    FormData
  >(submitDataRequestAction, null);

  if (state && "ok" in state) {
    return (
      <Alert>
        <AlertDescription>{state.ok}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state && "error" in state && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email on your account</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          We reply to this address, so it has to be one you can read.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">What do you want?</legend>
        {KINDS.map((kind, i) => (
          <div key={kind.value} className="flex gap-3">
            <input
              type="radio"
              id={`kind-${kind.value}`}
              name="kind"
              value={kind.value}
              defaultChecked={i === 0}
              required
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <div>
              <Label htmlFor={`kind-${kind.value}`} className="font-normal">
                {kind.label}
              </Label>
              <p className="text-xs text-muted-foreground">{kind.hint}</p>
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details">Anything else we should know</Label>
        <Textarea id="details" name="details" rows={3} />
      </div>

      <Button type="submit" className="h-12" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
