"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { advocacy } from "@/content/advocacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required."),
  organization: z.string().trim().min(1, "Organization or school is required."),
  eventType: z.string().trim().min(1, "Pick an event type."),
  date: z.string().trim(),
  audienceSize: z.string().trim(),
  message: z.string().trim().min(1, "Tell us a bit about the event."),
});

type FormInput = z.infer<typeof schema>;

export function SpeakerBookingForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { fields, submit } = advocacy.speakerBooking.form;

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      organization: "",
      eventType: "",
      date: "",
      audienceSize: "",
      message: "",
    },
  });

  async function onSubmit(values: FormInput) {
    setStatus("idle");
    try {
      const res = await fetch("/api/speaker-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <p className="text-base leading-relaxed">
          {advocacy.speakerBooking.form.success}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      {status === "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {advocacy.speakerBooking.form.error}
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{fields.name.label}</Label>
            <Input
              id="name"
              placeholder={fields.name.placeholder}
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organization">{fields.organization.label}</Label>
            <Input
              id="organization"
              placeholder={fields.organization.placeholder}
              {...form.register("organization")}
              aria-invalid={!!form.formState.errors.organization}
            />
            {form.formState.errors.organization && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.organization.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventType">{fields.eventType.label}</Label>
            <Select
              onValueChange={(v) =>
                form.setValue("eventType", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="eventType" className="w-full">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {fields.eventType.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.eventType && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.eventType.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">{fields.date.label}</Label>
            <Input
              id="date"
              type="date"
              {...form.register("date")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audienceSize">{fields.audienceSize.label}</Label>
            <Input
              id="audienceSize"
              placeholder={fields.audienceSize.placeholder}
              inputMode="numeric"
              {...form.register("audienceSize")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message">{fields.message.label}</Label>
          <Textarea
            id="message"
            rows={5}
            placeholder={fields.message.placeholder}
            {...form.register("message")}
            aria-invalid={!!form.formState.errors.message}
          />
          {form.formState.errors.message && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.message.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 sm:w-fit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Sending…" : submit}
        </Button>
      </form>
    </div>
  );
}
