import { AdminForm } from "@/components/admin/admin-form";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import type { AdminQuestion } from "@/lib/db/assessments";
import { OPTION_IDS } from "@/lib/assessment/options";
import { deleteQuestionAction, saveQuestionAction } from "../actions";

function QuestionFields({
  question,
  competencies,
  defaultSortOrder = 0,
}: {
  question?: AdminQuestion;
  competencies: string[];
  defaultSortOrder?: number;
}) {
  const optionText = new Map(
    (question?.options ?? []).map((o) => [o.id, o.text]),
  );

  return (
    <>
      <TextAreaField
        name="prompt"
        label="Question"
        required
        rows={4}
        defaultValue={question?.prompt}
        hint="Write it as a scenario the learner could actually face — §8 tests decisions, not definitions."
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Answer options</legend>
        {OPTION_IDS.map((id) => (
          <TextField
            key={id}
            name={`option_${id}`}
            label={`Option ${id.toUpperCase()}`}
            defaultValue={optionText.get(id) ?? ""}
            hint={
              id === "c"
                ? "Leave the rest blank if you only need three or four."
                : undefined
            }
          />
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="correct_option_id"
          label="Correct answer"
          defaultValue={question?.correct_option_id}
          options={OPTION_IDS.map((id) => ({
            value: id,
            label: `Option ${id.toUpperCase()}`,
          }))}
        />
        <SelectField
          name="competency"
          label="Competency"
          defaultValue={question?.competency}
          options={competencies.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <TextAreaField
        name="explanation"
        label="Explanation"
        rows={3}
        defaultValue={question?.explanation}
        hint="Shown after scoring. Explain why the right answer is right, not just what it is."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="points"
          label="Points"
          type="number"
          defaultValue={question?.points ?? 1}
        />
        <TextField
          name="sort_order"
          label="Sort order"
          type="number"
          defaultValue={question?.sort_order ?? defaultSortOrder}
        />
      </div>
    </>
  );
}

export function NewQuestionForm({
  assessmentId,
  competencies,
  defaultSortOrder,
}: {
  assessmentId: string;
  competencies: string[];
  defaultSortOrder: number;
}) {
  return (
    <AdminForm action={saveQuestionAction} submitLabel="Add question">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <QuestionFields
        competencies={competencies}
        defaultSortOrder={defaultSortOrder}
      />
    </AdminForm>
  );
}

export function QuestionEditor({
  assessmentId,
  question,
  competencies,
  index,
}: {
  assessmentId: string;
  question: AdminQuestion;
  competencies: string[];
  index: number;
}) {
  return (
    <details className="rounded-lg border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 p-4">
        <span className="text-sm">
          <span className="mr-2 font-mono text-xs text-muted-foreground">
            {index}
          </span>
          {question.prompt.slice(0, 110)}
          {question.prompt.length > 110 ? "…" : ""}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {question.competency}
        </span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-border p-4">
        <AdminForm action={saveQuestionAction}>
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="questionId" value={question.id} />
          <QuestionFields question={question} competencies={competencies} />
        </AdminForm>

        <div className="border-t border-border pt-4">
          <AdminForm
            action={deleteQuestionAction}
            submitLabel="Delete this question"
            destructive
          >
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="questionId" value={question.id} />
            <CheckboxField
              name="confirm"
              label="Yes, delete this question"
              hint="Past attempts keep the answers they recorded; only future takers are affected."
            />
          </AdminForm>
        </div>
      </div>
    </details>
  );
}
