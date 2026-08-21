"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { track } from "@/lib/analytics";
import type { PublicQuestion } from "@/lib/db/assessments";
import type { CompetencyResult } from "@/lib/assessment/scoring";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ExamPlayerProps = {
  /** Free-track exams are the §13 top-of-funnel conversion, counted separately. */
  isFreeTrack?: boolean;
  /**
   * A chapter quiz is formative — you retake it until it sticks, and passing
   * one never issues anything. The result screen has to say so, or a learner
   * reasonably reads "Passed" as "I have earned the certificate".
   */
  isChapterQuiz?: boolean;
  courseSlug?: string | null;
  examSlug: string;
  examTitle: string;
  passingScore: number;
  attemptsRemaining: number;
  questions: PublicQuestion[];
};

type ExamResult = {
  score: number;
  passed: boolean;
  passingScore: number;
  competencies: CompetencyResult[];
  credentialCode: string | null;
};

export function ExamPlayer({
  isFreeTrack = false,
  isChapterQuiz = false,
  courseSlug = null,
  examSlug,
  examTitle,
  passingScore,
  attemptsRemaining,
  questions,
}: ExamPlayerProps) {
  const [phase, setPhase] = useState<"intro" | "quiz" | "submitting" | "done">(
    "intro",
  );
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const res = await fetch(`/api/exams/${examSlug}/attempts`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start the exam.");
      setAttemptId(data.attemptId);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the exam.");
    }
  }

  async function submit() {
    if (!attemptId) return;
    setPhase("submitting");
    setError(null);
    try {
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
      const res = await fetch(`/api/exams/attempts/${attemptId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not score your exam.");
      setResult(data);
      setPhase("done");
      if (data.passed) {
        if (isFreeTrack) track("free_exam_passed");
        if (data.credentialCode) track("credential_issued");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your exam.");
      setPhase("quiz");
    }
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <h1 className="font-display text-2xl font-semibold">{examTitle}</h1>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>· {questions.length} questions, one at a time</li>
          <li>· Pass mark: {passingScore}%</li>
          <li>
            · This uses one of your {attemptsRemaining} remaining attempts once
            you submit
          </li>
          <li>· Pass and your credential is issued immediately</li>
        </ul>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={() => void start()} className="h-12">
            Start the exam
          </Button>
          <Button asChild variant="ghost" className="h-12">
            <Link href="/dashboard/assessments">Not yet</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-primary uppercase">
            {examTitle}
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <p className="font-mono text-6xl font-semibold">{result.score}</p>
            <p className="font-mono text-xl text-muted-foreground">/100</p>
          </div>
          <h1 className="font-display mt-3 text-xl font-semibold">
            {!result.passed
              ? `Not this time — the pass mark is ${result.passingScore}%.`
              : isChapterQuiz
                ? "Chapter passed."
                : result.credentialCode
                  ? "Passed. Your credential is live."
                  : "Passed."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {!result.passed
              ? isChapterQuiz
                ? "Retake it as many times as you like — this one is for learning, not for gatekeeping. Review the weak areas below first."
                : "Review the lessons for your weakest areas below, then use another attempt when you're ready."
              : isChapterQuiz
                ? "On to the next chapter. Your certificate comes from the final assignment, once all the chapters are done."
                : result.credentialCode
                  ? "It's already publicly verifiable — the code below is yours permanently."
                  : // A pass without a code means the credential already exists,
                    // or the enrollment is not active yet. Never claim a public
                    // page that the holder cannot open.
                    "Your score is recorded. Check your credentials page for the certificate — if it isn't there yet, your enrollment is still awaiting confirmation."}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
          {/* A quiz that asked nothing about tool fluency has not measured it,
              and showing it as 0 reads as a failure rather than a silence. */}
          {result.competencies
            .filter((c) => c.total > 0)
            .map((c) => (
              <div
                key={c.key}
                className="flex items-baseline justify-between text-sm"
              >
                <span>{c.label}</span>
                <span className="font-mono text-muted-foreground">{c.score}</span>
              </div>
            ))}
        </div>

        {result.passed && result.credentialCode ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-verified/10 p-4">
              <BadgeCheck className="size-5 text-verified" aria-hidden />
              <p className="font-mono text-lg tracking-wider">
                {result.credentialCode}
              </p>
            </div>
            <Button asChild className="h-12">
              <Link href={`/verify/${result.credentialCode}`}>
                View my public verification page
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link href="/dashboard/credentials">My credentials</Link>
            </Button>
          </div>
        ) : isChapterQuiz && courseSlug ? (
          <div className="flex flex-col gap-3">
            <Button asChild className="h-12">
              <Link href="/dashboard/courses">
                {result.passed ? "Continue the course" : "Back to the lessons"}
              </Link>
            </Button>
            {result.passed && (
              <Button asChild variant="outline" className="h-12">
                <Link href={`/dashboard/assignments/${courseSlug}`}>
                  See the final assignment
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Button asChild className="h-12">
            <Link href="/dashboard/courses">Back to my courses</Link>
          </Button>
        )}
      </div>
    );
  }

  const question = questions[index];
  const selected = answers[question.id];
  const progress = Math.round((index / questions.length) * 100);
  const isLast = index === questions.length - 1;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <p className="font-mono text-sm whitespace-nowrap text-muted-foreground">
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
        <legend className="font-display text-lg leading-snug font-semibold text-balance">
          {question.prompt}
        </legend>
        <div className="mt-2 flex flex-col gap-2.5" role="radiogroup">
          {question.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                }
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
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0 || phase === "submitting"}
          className="h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => (isLast ? void submit() : setIndex(index + 1))}
          disabled={!selected || phase === "submitting"}
          className="h-11 min-w-32"
        >
          {phase === "submitting"
            ? "Scoring…"
            : isLast
              ? "Submit exam"
              : "Next"}
        </Button>
      </div>
    </div>
  );
}
