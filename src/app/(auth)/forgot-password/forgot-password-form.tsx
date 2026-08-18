"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authErrorMessage, requestPasswordReset } from "@/lib/auth/client";
import { resetSchema, type ResetInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResetInput) {
    setServerError(null);
    try {
      await requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (e) {
      // Don't reveal whether an email is registered — show success either way
      // unless it's a network/format problem.
      const message = authErrorMessage(e);
      if (message.includes("Network")) {
        setServerError(message);
      } else {
        setSentTo(values.email);
      }
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
          a reset link is on its way. It can take a minute or two to arrive —
          check spam too.
        </p>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send a reset link.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            {...form.register("email")}
            aria-invalid={!!form.formState.errors.email}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
