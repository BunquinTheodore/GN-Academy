"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EmailGateProps = {
  submitting: boolean;
  error: string | null;
  onSubmit: (email: string, marketingConsent: boolean) => void;
  onSkip: () => void;
  onBack: () => void;
};

/**
 * §8: email is asked only here, after the final question — never before.
 * Skipping is possible but quiet; the email is the product's lifeline.
 */
export function EmailGate({
  submitting,
  error,
  onSubmit,
  onSkip,
  onBack,
}: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);
    onSubmit(trimmed, consent);
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-8">
      <div>
        <p className="font-mono text-xs tracking-wider text-primary uppercase">
          Test complete
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-balance">
          Your score is ready
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll show your full result now: score,
          competency breakdown, and the one area to fix first. We&apos;ll also
          send you a copy so you don&apos;t lose it.
        </p>
      </div>

      {(error || localError) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {error ?? localError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <label
          htmlFor="gate-consent"
          className="flex min-h-11 items-start gap-3 text-sm text-muted-foreground"
        >
          <Checkbox
            id="gate-consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            className="mt-0.5"
            disabled={submitting}
          />
          <span>
            Also send me course updates and career tips. Optional: your
            result email arrives either way.
          </span>
        </label>

        <Button type="submit" className="h-12 w-full" disabled={submitting}>
          {submitting ? "Scoring your test…" : "Show my result"}
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to questions
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting}
          className="min-h-11 px-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip and show my result without saving it
        </button>
      </div>
    </div>
  );
}
