/**
 * Loads course content from supabase/courses/*.json into the database.
 *
 *   npx tsx scripts/seed-courses.ts                    # load every file
 *   npx tsx scripts/seed-courses.ts ai-essentials      # load one
 *   npx tsx scripts/seed-courses.ts --replace-questions # see the warning below
 *
 * Idempotent, and deliberately conservative about what it overwrites. Courses,
 * chapters and lesson text are the authored source and get refreshed on every
 * run. Quiz questions are inserted only when a chapter quiz has none, matching
 * how supabase/seed.sql already behaves. Otherwise an admin's edits in /admin
 * would be silently reverted the next time someone ran a seed.
 *
 * --replace-questions overrides that and rewrites the question set from the
 * file. It DISCARDS anything edited in /admin, so it is opt-in and loud. Use it
 * when the authored questions themselves changed, which so far has meant a
 * copy edit across every course at once.
 *
 * Nothing is deleted. Lessons are matched on (module_id, slug), which is a
 * unique constraint, so re-running never orphans a learner's progress.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Question = {
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  competency: string;
  explanation: string;
};

type CourseFile = {
  slug: string;
  title: string;
  subtitle: string;
  level: "foundation" | "professional" | "advanced";
  category: string;
  format: string;
  summary: string;
  description: string;
  skills: string[];
  outcomes: string[];
  roles: string[];
  price_php: number | null;
  is_free: boolean;
  passing_score: number;
  credential_prefix: string;
  sort_order: number;
  modules: {
    slug: string;
    title: string;
    description: string;
    lessons: {
      slug: string;
      title: string;
      content_mdx: string;
      duration_minutes: number;
      is_preview?: boolean;
    }[];
    quiz: Question[];
  }[];
  assignment: {
    title: string;
    brief_mdx: string;
    criteria: string[];
    min_words: number;
  };
};

const COURSES_DIR = join(process.cwd(), "supabase", "courses");

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadCourse(
  db: SupabaseClient,
  course: CourseFile,
  replaceQuestions: boolean,
) {
  console.log(`\n── ${course.title} (${course.slug})`);

  const { data: cert, error: certError } = await db
    .from("certifications")
    .upsert(
      {
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        level: course.level,
        category: course.category,
        format: course.format,
        summary: course.summary,
        description: course.description,
        skills: course.skills,
        outcomes: course.outcomes,
        roles: course.roles,
        price_php: course.price_php,
        is_free: course.is_free,
        passing_score: course.passing_score,
        credential_prefix: course.credential_prefix,
        sort_order: course.sort_order,
        is_published: true,
        requires_assignment: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (certError) throw certError;
  console.log("   certification ok");

  for (const [index, mod] of course.modules.entries()) {
    // Matched on slug, never on title. Matching on title meant that renaming a
    // chapter inserted a second module and re-created its lessons as new rows,
    // which silently reset every enrolled learner's progress for that chapter
    // and re-locked the final assignment for people who had already finished.
    const { data: existingModule } = await db
      .from("modules")
      .select("id")
      .eq("certification_id", cert.id)
      .eq("slug", mod.slug)
      .maybeSingle();

    let moduleId = existingModule?.id as string | undefined;
    if (moduleId) {
      const { error } = await db
        .from("modules")
        .update({
          title: mod.title,
          description: mod.description,
          sort_order: index + 1,
        })
        .eq("id", moduleId);
      if (error) throw error;
    } else {
      const { data, error } = await db
        .from("modules")
        .insert({
          certification_id: cert.id,
          slug: mod.slug,
          title: mod.title,
          description: mod.description,
          sort_order: index + 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      moduleId = data.id;
    }

    for (const [li, lesson] of mod.lessons.entries()) {
      const { error } = await db.from("lessons").upsert(
        {
          module_id: moduleId,
          slug: lesson.slug,
          title: lesson.title,
          content_mdx: lesson.content_mdx,
          duration_minutes: lesson.duration_minutes,
          sort_order: li + 1,
          // The first lesson of the first chapter is readable before paying:
          // a sample of the real thing sells the rest better than a summary.
          is_preview: lesson.is_preview ?? (index === 0 && li === 0),
        },
        { onConflict: "module_id,slug" },
      );
      if (error) throw error;
    }

    const quizSlug = `${course.slug}-chapter-${index + 1}`;
    const { data: quiz, error: quizError } = await db
      .from("assessments")
      .upsert(
        {
          slug: quizSlug,
          certification_id: cert.id,
          module_id: moduleId,
          title: `${mod.title}: chapter quiz`,
          type: "chapter",
          passing_score: 70,
          question_count: mod.quiz.length,
          // Chapter quizzes are for learning, not for gatekeeping. Retake them.
          max_attempts: 99,
          is_published: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (quizError) throw quizError;

    const { count } = await db
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", quiz.id);

    // Rewriting the wording of an existing question set must not change the
    // question ids. `attempts.answers` stores the id of every question a
    // learner answered and there is no foreign key behind it, so deleting and
    // re-inserting scores an in-flight attempt as zero and burns one of the
    // learner's allowed tries. When the file still has the same number of
    // questions, which is what a copy edit looks like, update them in place by
    // sort_order and leave the ids alone. `scripts/refresh-seed-content.ts`
    // avoids the same trap for the same reason.
    const sameShape = replaceQuestions && (count ?? 0) === mod.quiz.length;

    if (sameShape) {
      const { data: existing, error: readError } = await db
        .from("questions")
        .select("id, sort_order")
        .eq("assessment_id", quiz.id)
        .order("sort_order");
      if (readError) throw readError;

      for (const [qi, q] of mod.quiz.entries()) {
        const row = existing?.find((r) => r.sort_order === qi + 1);
        if (!row) continue;
        const { error } = await db
          .from("questions")
          .update({
            prompt: q.prompt,
            options: q.options,
            correct_option_id: q.correct_option_id,
            competency: q.competency,
            explanation: q.explanation,
          })
          .eq("id", row.id);
        if (error) throw error;
      }
      console.log(
        `   chapter ${index + 1}: ${mod.lessons.length} lessons, ${mod.quiz.length} questions rewritten in place`,
      );
    }

    if (replaceQuestions && !sameShape && (count ?? 0) > 0) {
      // The question count changed, so there is no safe positional match.
      console.warn(
        `   chapter ${index + 1}: question count changed (${count} in the database, ${mod.quiz.length} in the file). Replacing them, which invalidates any attempt still in progress on this quiz.`,
      );
      const { error } = await db
        .from("questions")
        .delete()
        .eq("assessment_id", quiz.id);
      if (error) throw error;
    }

    if (!sameShape && (replaceQuestions || (count ?? 0) === 0)) {
      const rows = mod.quiz.map((q, qi) => ({
        assessment_id: quiz.id,
        prompt: q.prompt,
        options: q.options,
        correct_option_id: q.correct_option_id,
        competency: q.competency,
        explanation: q.explanation,
        points: 1,
        sort_order: qi + 1,
      }));
      const { error } = await db.from("questions").insert(rows);
      if (error) throw error;
      console.log(`   chapter ${index + 1}: ${mod.lessons.length} lessons, ${rows.length} questions`);
    } else {
      console.log(
        `   chapter ${index + 1}: ${mod.lessons.length} lessons, questions left alone (${count} already there)`,
      );
    }
  }

  const { error: assignmentError } = await db.from("assignments").upsert(
    {
      certification_id: cert.id,
      title: course.assignment.title,
      brief_mdx: course.assignment.brief_mdx,
      criteria: course.assignment.criteria,
      min_words: course.assignment.min_words,
      is_published: true,
    },
    { onConflict: "certification_id" },
  );
  if (assignmentError) throw assignmentError;
  console.log(`   assignment: ${course.assignment.title}`);
}

async function main() {
  const args = process.argv.slice(2);
  const replaceQuestions = args.includes("--replace-questions");
  const only = args.find((a) => !a.startsWith("--"));
  const files = readdirSync(COURSES_DIR).filter((f) => f.endsWith(".json"));
  const chosen = only ? files.filter((f) => f.startsWith(only)) : files;

  if (chosen.length === 0) {
    console.error(`No course files matched${only ? ` "${only}"` : ""} in ${COURSES_DIR}`);
    process.exit(1);
  }

  const db = client();
  if (replaceQuestions) {
    console.log(
      "--replace-questions: existing quiz questions will be deleted and rewritten from the files.",
    );
  }
  for (const file of chosen) {
    const course = JSON.parse(readFileSync(join(COURSES_DIR, file), "utf8")) as CourseFile;
    await loadCourse(db, course, replaceQuestions);
  }
  console.log("\nAll done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
