import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import {
  getPublicQuestions,
  getPublishedAssessmentBySlug,
} from "@/lib/db/assessments";
import { Quiz } from "./quiz";

export const metadata: Metadata = {
  title: "AI Readiness Test",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  let questions = null;
  let assessment = null;
  try {
    assessment = await getPublishedAssessmentBySlug("ai-readiness");
    if (assessment) {
      questions = await getPublicQuestions(assessment.id);
    }
  } catch {
    // fall through to the error state below
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex justify-center px-4 py-5">
        <Link href="/" className="font-display text-lg font-semibold">
          {site.name}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-16">
        {assessment && questions && questions.length > 0 ? (
          <Quiz
            assessmentSlug={assessment.slug}
            questions={questions}
          />
        ) : (
          <div className="flex flex-1 flex-col items-start justify-center gap-4">
            <h1 className="font-display text-2xl font-semibold">
              The test couldn&apos;t load
            </h1>
            <p className="text-muted-foreground">
              Something went wrong on our side — your connection is fine.
              Reload the page to try again; nothing you&apos;ve done is lost.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
