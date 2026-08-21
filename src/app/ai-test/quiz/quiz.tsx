"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";
import type { PublicQuestion } from "@/lib/db/assessments";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmailGate } from "./email-gate";

type QuizProps = {
  assessmentSlug: string;
  questions: PublicQuestion[];
};

type StoredState = {
  attemptId: string | null;
  answers: Record<string, string>; // questionId -> optionId
  index: number;
};

export function Quiz({ assessmentSlug, questions }: QuizProps) {
  const router = useRouter();
  const storageKey = `gn-quiz-${assessmentSlug}`;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"loading" | "quiz" | "gate" | "submitting">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Restore any in-progress state, then ensure an attempt exists.
  useEffect(() => {
    let stored: StoredState | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) stored = JSON.parse(raw) as StoredState;
    } catch {
      // corrupted storage — start fresh
    }
    if (stored) {
      setAnswers(stored.answers ?? {});
      setIndex(Math.min(stored.index ?? 0, questions.length - 1));
      setAttemptId(stored.attemptId);
    }

    async function ensureAttempt(existing: string | null) {
      if (existing) {
        setPhase("quiz");
        return;
      }
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentSlug }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Could not start the test.");
        }
        const data = (await res.json()) as { attemptId: string };
        setAttemptId(data.attemptId);
        if (!startedRef.current) {
          startedRef.current = true;
          track("test_started");
        }
        setPhase("quiz");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the test.");
        setPhase("quiz");
      }
    }
    void ensureAttempt(stored?.attemptId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist locally on every change (§8: refresh loses nothing).
  useEffect(() => {
    if (phase === "loading") return;
    const state: StoredState = { attemptId, answers, index };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // storage full/blocked — server copy still exists
    }
  }, [attemptId, answers, index, phase, storageKey]);

  // Browser back moves one question back instead of leaving the test.
  useEffect(() => {
    if (phase !== "quiz" && phase !== "gate") return;
    history.pushState({ quizIndex: index }, "");
    const onPop = () => {
      setPhase((p) => {
        if (p === "gate") return "quiz";
        return p;
      });
      setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [index, phase]);

  const syncAnswers = useCallback(
    (next: Record<string, string>) => {
      if (!attemptId) return;
      const payload = Object.entries(next).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
      void fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      }).catch(() => {
        // localStorage still has it; next sync retries
      });
    },
    [attemptId],
  );

  function selectOption(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    track("test_question_answered", { question: index + 1 });
    syncAnswers(next);
  }

  function goNext() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      setPhase("gate");
    }
  }

  function goBack() {
    if (phase === "gate") {
      setPhase("quiz");
      return;
    }
    setIndex(Math.max(0, index - 1));
  }

  async function complete(email?: string, marketingConsent?: boolean) {
    if (!attemptId) {
      setError("The test never started properly. Reload the page to retry.");
      return;
    }
    setPhase("submitting");
    setError(null);
    try {
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
      const res = await fetch(`/api/attempts/${attemptId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: payload,
          email: email || undefined,
          marketingConsent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not score your test.");
      }
      track("test_completed");
      if (email) track("email_captured");
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // non-fatal
      }
      router.replace(`/ai-test/results/${attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your test.");
      setPhase("gate");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Preparing your test…</p>
      </div>
    );
  }

  if (phase === "gate" || phase === "submitting") {
    return (
      <EmailGate
        submitting={phase === "submitting"}
        error={error}
        onSubmit={(email, consent) => void complete(email, consent)}
        onSkip={() => void complete()}
        onBack={goBack}
      />
    );
  }

  const question = questions[index];
  const selected = answers[question.id];
  const progress = Math.round((index / questions.length) * 100);

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex items-center gap-4">
        <p className="font-mono text-sm text-muted-foreground whitespace-nowrap">
          {index + 1} / {questions.length}
        </p>
        <Progress
          value={progress}
          aria-label={`Question ${index + 1} of ${questions.length}`}
          className="h-1.5"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {error}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend id={`prompt-${question.id}`} className="font-display text-lg leading-snug font-semibold text-balance sm:text-xl">
          {question.prompt}
        </legend>
        {/*
          Named by the question itself, so a screen reader entering the
          group hears what it is answering. It also separates these radios
          from the theme toggle, which is a radiogroup too and sits in the
          same page.
        */}
        <div
          className="mt-2 flex flex-col gap-2.5"
          role="radiogroup"
          aria-labelledby={`prompt-${question.id}`}
        >
          {question.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectOption(question.id, option.id)}
                className={`min-h-11 rounded-lg border p-3.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border bg-card hover:border-muted-foreground/40"
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          disabled={index === 0}
          className="h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
        <Button
          type="button"
          onClick={goNext}
          disabled={!selected}
          className="h-11 min-w-32"
        >
          {index === questions.length - 1 ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
