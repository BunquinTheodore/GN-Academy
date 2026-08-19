import { AdminForm } from "@/components/admin/admin-form";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import type { Lesson, Module } from "@/lib/db/certifications";
import {
  deleteLessonAction,
  deleteModuleAction,
  saveLessonAction,
  saveModuleAction,
} from "../actions";

/**
 * Each module and lesson is its own <details> disclosure with its own form.
 * Native disclosure means no client JS for the open/close, and one form per
 * entity means a save never touches a sibling the admin didn't look at.
 */

export function NewModuleForm({
  certificationId,
  defaultSortOrder,
}: {
  certificationId: string;
  defaultSortOrder: number;
}) {
  return (
    <AdminForm action={saveModuleAction} submitLabel="Add module">
      <input type="hidden" name="certificationId" value={certificationId} />
      <TextField name="title" label="Module title" required />
      <TextAreaField name="description" label="Description" rows={2} />
      <TextField
        name="sort_order"
        label="Sort order"
        type="number"
        defaultValue={defaultSortOrder}
      />
    </AdminForm>
  );
}

function LessonFields({
  lesson,
  defaultSortOrder = 0,
}: {
  lesson?: Lesson;
  defaultSortOrder?: number;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="title"
          label="Lesson title"
          required
          defaultValue={lesson?.title}
        />
        <TextField
          name="slug"
          label="Slug"
          required
          defaultValue={lesson?.slug}
          placeholder="inbox-workflows"
        />
      </div>

      <TextAreaField
        name="content_mdx"
        label="Lesson body (Markdown)"
        rows={14}
        defaultValue={lesson?.content_mdx}
        hint="# heading, ## subheading, - bullets, **bold**, [links](https://…)."
        className="font-mono"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="video_url"
          label="Video URL"
          type="url"
          defaultValue={lesson?.video_url}
          hint="Optional."
        />
        <TextField
          name="duration_minutes"
          label="Minutes"
          type="number"
          defaultValue={lesson?.duration_minutes}
        />
        <TextField
          name="sort_order"
          label="Sort order"
          type="number"
          defaultValue={lesson?.sort_order ?? defaultSortOrder}
        />
      </div>

      <CheckboxField
        name="is_preview"
        label="Free preview"
        defaultChecked={lesson?.is_preview}
        hint="Readable without enrolling. Use it on one strong lesson per course."
      />
    </>
  );
}

export function ModuleEditor({
  certificationId,
  module,
  lessons,
}: {
  certificationId: string;
  module: Module;
  lessons: Lesson[];
}) {
  const nextLessonOrder =
    lessons.reduce((max, l) => Math.max(max, l.sort_order), 0) + 1;

  return (
    <details className="rounded-lg border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="font-medium">{module.title}</span>
        <span className="text-xs text-muted-foreground">
          {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
        </span>
      </summary>

      <div className="flex flex-col gap-8 border-t border-border p-4">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold">Module details</h3>
          <div className="mt-3">
            <AdminForm action={saveModuleAction}>
              <input
                type="hidden"
                name="certificationId"
                value={certificationId}
              />
              <input type="hidden" name="moduleId" value={module.id} />
              <TextField
                name="title"
                label="Title"
                required
                defaultValue={module.title}
              />
              <TextAreaField
                name="description"
                label="Description"
                rows={2}
                defaultValue={module.description}
              />
              <TextField
                name="sort_order"
                label="Sort order"
                type="number"
                defaultValue={module.sort_order}
              />
            </AdminForm>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Lessons</h3>
          <div className="mt-3 flex flex-col gap-2">
            {lessons.map((lesson) => (
              <details
                key={lesson.id}
                className="rounded-md border border-border"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{lesson.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {lesson.is_preview ? "Preview · " : ""}
                    {lesson.duration_minutes ?? 0} min
                  </span>
                </summary>
                <div className="flex flex-col gap-6 border-t border-border p-3">
                  <AdminForm action={saveLessonAction}>
                    <input
                      type="hidden"
                      name="certificationId"
                      value={certificationId}
                    />
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <LessonFields lesson={lesson} />
                  </AdminForm>

                  <div className="border-t border-border pt-4">
                    <AdminForm
                      action={deleteLessonAction}
                      submitLabel="Delete this lesson"
                      destructive
                    >
                      <input
                        type="hidden"
                        name="certificationId"
                        value={certificationId}
                      />
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <p className="text-xs text-muted-foreground">
                        Deleting a lesson also removes learners&apos; completion
                        records for it.
                      </p>
                    </AdminForm>
                  </div>
                </div>
              </details>
            ))}

            <details className="rounded-md border border-dashed border-border">
              <summary className="min-h-11 cursor-pointer list-none px-3 py-2 text-sm text-muted-foreground">
                + Add a lesson
              </summary>
              <div className="border-t border-border p-3">
                <AdminForm action={saveLessonAction} submitLabel="Add lesson">
                  <input
                    type="hidden"
                    name="certificationId"
                    value={certificationId}
                  />
                  <input type="hidden" name="moduleId" value={module.id} />
                  <LessonFields defaultSortOrder={nextLessonOrder} />
                </AdminForm>
              </div>
            </details>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <AdminForm
            action={deleteModuleAction}
            submitLabel="Delete this module"
            destructive
          >
            <input
              type="hidden"
              name="certificationId"
              value={certificationId}
            />
            <input type="hidden" name="moduleId" value={module.id} />
            <CheckboxField
              name="confirm"
              label={`Yes, delete "${module.title}" and its ${lessons.length} lesson(s)`}
            />
          </AdminForm>
        </div>
      </div>
    </details>
  );
}
