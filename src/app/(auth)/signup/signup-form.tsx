"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  authErrorMessage,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/client";
import { signUpSchema, safeNextPath, type SignUpInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleMark } from "@/components/google-mark";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [serverError, setServerError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      marketingConsent: false,
    },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    try {
      await signUpWithEmail(values);
      router.push(nextPath);
      router.refresh();
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  }

  async function onGoogle() {
    setServerError(null);
    setGooglePending(true);
    try {
      await signInWithGoogle();
      router.push(nextPath);
      router.refresh();
    } catch (e) {
      setServerError(authErrorMessage(e));
    } finally {
      setGooglePending(false);
    }
  }

  const pending = form.formState.isSubmitting || googlePending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Free to join. Your test results and progress are saved to it.
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
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            {...form.register("fullName")}
            aria-invalid={!!form.formState.errors.fullName}
          />
          {form.formState.errors.fullName && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
            aria-invalid={!!form.formState.errors.password}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* §14: marketing consent is separate from account creation, never bundled. */}
        <Controller
          control={form.control}
          name="marketingConsent"
          render={({ field }) => (
            <label
              htmlFor="marketingConsent"
              className="flex min-h-11 items-start gap-3 text-sm text-muted-foreground"
            >
              <Checkbox
                id="marketingConsent"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5"
              />
              <span>
                Send me course updates and career tips by email. Optional — you
                can turn this off any time.
              </span>
            </label>
          )}
        />

        <Button type="submit" className="mt-1 h-11 w-full" disabled={pending}>
          {form.formState.isSubmitting
            ? "Creating your account…"
            : "Create my account"}
        </Button>

        <p className="text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={onGoogle}
        disabled={pending}
      >
        <GoogleMark className="size-4" />
        {googlePending ? "Waiting for Google…" : "Continue with Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
