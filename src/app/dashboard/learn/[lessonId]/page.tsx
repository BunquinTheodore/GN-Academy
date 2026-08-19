import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCertificationForLesson,
  getLessonById,
  getModulesWithLessonMeta,
} from "@/lib/db/certifications";
import { getEnrollment } from "@/lib/db/enrollments";
import { getCompletedLessonIds } from "@/lib/db/progress";
import { Button } from "@/components/ui/button";
import { CompleteLessonForm } from "./complete-lesson-form";

export const metadata: Metadata = {
  title: "Lesson",
  robots: { index: false, follow: false },
};

const paramsSchema = z.object({ lessonId: z.string().uuid() });

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) notFound();
  const { lessonId } = parsed.data;

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/learn/${lessonId}`)}`);

  const [lesson, context] = await Promise.all([
    getLessonById(lessonId).catch(() => null),
    getCertificationForLesson(lessonId).catch(() => null),
  ]);
  if (!lesson || !context) notFound();

  // Access: active/completed enrollment, or a free-preview lesson (§7).
  const enrollment = await getEnrollment(user.uid, context.certification.id).catch(
    () => null,
  );
  const enrolled =
    !!enrollment && ["active", "completed"].includes(enrollment.status);
  if (!enrolled && !lesson.is_preview) {
    redirect(`/certifications/${context.certification.slug}`);
  }

  const modules = await getModulesWithLessonMeta(context.certification.id);
  const allLessons = modules.flatMap((m) => m.lessons);
  const index = allLessons.findIndex((l) => l.id === lessonId);
  const previous = index > 0 ? allLessons[index - 1] : null;
  const done = enrolled
    ? await getCompletedLessonIds(user.uid, [lessonId]).catch(
        () => new Set<string>(),
      )
    : new Set<string>();
  const isDone = done.has(lessonId);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/courses"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          My courses
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          Lesson {index + 1} of {allLessons.length}
        </p>
      </div>

      <article className="prose-headings:font-display mt-6 flex flex-col gap-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:text-[0.95rem] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
        {lesson.content_mdx ? (
          <MDXRemote source={lesson.content_mdx} />
        ) : (
          <p className="text-muted-foreground">
            This lesson&apos;s content is being prepared. Check back soon.
          </p>
        )}
      </article>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
        {previous ? (
          <Button asChild variant="ghost">
            <Link href={`/dashboard/learn/${previous.id}`}>
              <ArrowLeft className="size-4" aria-hidden />
              Previous
            </Link>
          </Button>
        ) : (
          <span />
        )}

        {enrolled ? (
          <CompleteLessonForm
            lessonId={lessonId}
            isDone={isDone}
            isFreeTrack={context.certification.is_free}
          />
        ) : (
          <Button asChild className="h-11">
            <Link href={`/certifications/${context.certification.slug}/enroll`}>
              Enroll to continue
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
