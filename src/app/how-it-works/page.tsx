import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";
import { home } from "@/content/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How GN Academy works, from free AI Readiness Test to verified credential to employer visibility.",
};

export default function HowItWorksPage() {
  return (
    <PageShell title="How it works">
      {home.ladder.steps.map((step, i) => (
        <div key={step.title}>
          <h2 className="text-lg font-semibold text-foreground">
            {i + 1}. {step.title}
          </h2>
          <p className="mt-1">{step.body}</p>
        </div>
      ))}
    </PageShell>
  );
}
