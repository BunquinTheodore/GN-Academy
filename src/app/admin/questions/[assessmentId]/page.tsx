import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import {
  getAssessmentById,
  listQuestionsForAdmin,
} from "@/lib/db/assessments";
import { COMPETENCIES } from "@/content/ai-test";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, TextField } from "@/components/admin/field";
import { saveAssessmentAction } from "../actions";
import { NewQuestionForm, QuestionEditor } from "./question-editor";

export const metadata: Metadata = {
  title: "Edit questions",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditQuestionsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const parsed = z.string().uuid().safeParse((await params).assessmentId);
  if (!parsed.success) notFound();
  const assessmentId = parsed.data;

  const assessment = await getAssessmentById(assessmentId).catch(() => null);
  if (!assessment) notFound();

  const questions = await listQuestionsForAdmin(assessmentId).catch(() => []);

  // The scoring engine only counts questions whose competency it knows about
  // (§8), so the editor offers exactly those keys and nothing else.
  const competencies = Object.keys(COMPETENCIES);

  const perCompetency = competencies.map((key) => ({
    key,
    count: questions.filter((q) => q.competency === key).length,
  }));
  const unknown = questions.filter(
    (q) => !competencies.includes(q.competency),
  ).length;
  const nextSortOrder =
    questions.reduce((max, q) => Math.max(max, q.sort_order), 0) + 1;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/questions"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Question sets
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">
          {assessment.title}
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {assessment.slug} · {questions.length} questions
        </p>
      </div>

      <section className="max-w-2xl">
        <h2 className="font-display text-lg font-semibold">Settings</h2>
        <div className="mt-4">
          <AdminForm action={saveAssessmentAction}>
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <TextField
              name="title"
              label="Title"
              required
              defaultValue={assessment.title}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                name="passing_score"
                label="Passing score"
                type="number"
                defaultValue={assessment.passing_score}
                hint="Blank for diagnostics."
              />
              <TextField
                name="max_attempts"
                label="Max attempts"
                type="number"
                defaultValue={assessment.max_attempts}
              />
              <TextField
                name="question_count"
                label="Questions shown"
                type="number"
                defaultValue={assessment.question_count}
              />
            </div>
            <CheckboxField
              name="is_published"
              label="Published"
              defaultChecked={assessment.is_published}
            />
          </AdminForm>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Coverage</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          A competency with no questions scores 0 for everyone, which drags
          every result down. Keep each one stocked.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {perCompetency.map(({ key, count }) => (
            <li
              key={key}
              className={
                count === 0
                  ? "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-sm"
                  : "rounded-md border border-border bg-card px-3 py-1.5 text-sm"
              }
            >
              {COMPETENCIES[key as keyof typeof COMPETENCIES].label}{" "}
              <span className="font-mono text-muted-foreground">{count}</span>
            </li>
          ))}
        </ul>
        {unknown > 0 && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {unknown} question{unknown === 1 ? " has" : "s have"} a competency
            the scoring engine doesn&apos;t recognise, so {unknown === 1 ? "it is" : "they are"}{" "}
            silently ignored when scoring. Reassign {unknown === 1 ? "it" : "them"} below.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Questions</h2>
        <div className="mt-4 flex flex-col gap-2">
          {questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No questions yet.
            </p>
          ) : (
            questions.map((question, i) => (
              <QuestionEditor
                key={question.id}
                assessmentId={assessmentId}
                question={question}
                competencies={competencies}
                index={i + 1}
              />
            ))
          )}
        </div>

        <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Add a question</h3>
          <div className="mt-3">
            <NewQuestionForm
              assessmentId={assessmentId}
              competencies={competencies}
              defaultSortOrder={nextSortOrder}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
