"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEnquiryAction, type EnquiryState } from "./actions";

export function EnquiryForm({ talent }: { talent?: string }) {
  const [state, formAction, pending] = useActionState<EnquiryState, FormData>(
    submitEnquiryAction,
    null,
  );

  if (state && "ok" in state) {
    return (
      <Alert>
        <AlertDescription>{state.ok}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {talent && <input type="hidden" name="talent" value={talent} />}

      {state && "error" in state && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employer_name">Your name</Label>
        <Input
          id="employer_name"
          name="employer_name"
          required
          autoComplete="name"
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employer_email">Email</Label>
        <Input
          id="employer_email"
          name="employer_email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          autoComplete="organization"
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">What you&apos;re hiring for</Label>
        <Textarea id="message" name="message" rows={6} required />
        <p className="text-xs text-muted-foreground">
          The role, the work involved, and whether it&apos;s part-time,
          full-time, or per-project. Specific beats formal.
        </p>
      </div>

      <Button type="submit" className="h-12" disabled={pending}>
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
