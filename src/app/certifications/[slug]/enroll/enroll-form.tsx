"use client";

import { useActionState } from "react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { enrollAction, type EnrollState } from "./actions";

export function EnrollForm({ slug, isFree }: { slug: string; isFree: boolean }) {
  const [state, formAction, pending] = useActionState<EnrollState, FormData>(
    enrollAction,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={() =>
        track(isFree ? "free_course_started" : "enrollment_started", {
          certification: slug,
        })
      }
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="slug" value={slug} />

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!isFree && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentMethod">Paid with</Label>
            <Select name="paymentMethod">
              <SelectTrigger id="paymentMethod" className="h-11 w-full">
                <SelectValue placeholder="Choose payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="maya">Maya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentRef">Payment reference number</Label>
            <Input
              id="paymentRef"
              name="paymentRef"
              placeholder="e.g. 9021456783312"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Found on your GCash/Maya receipt. We use it to match your payment.
            </p>
          </div>
        </>
      )}

      <Button type="submit" className="h-12 w-full" disabled={pending}>
        {pending
          ? "Submitting…"
          : isFree
            ? "Start learning now"
            : "Submit enrollment"}
      </Button>
    </form>
  );
}
