/**
 * Loads course content from supabase/courses/*.json into the database.
 *
 *   npx tsx scripts/seed-courses.ts                    # load every file
 *   npx tsx scripts/seed-courses.ts ai-essentials      # load one
 *   npx tsx scripts/seed-courses.ts --replace-questions # see the warning below
 *
 * A course file describes one of two shapes, and they end differently.
 * Assignment courses leave `requires_assignment` alone (it defaults to true,
 * which is what the four existing files rely on) and carry an `assignment`
 * block that a human reviews. Exam courses set `requires_assignment: false` and
 * carry a `final_exam` block whose pass issues the credential with nobody in
 * the loop. A file that claims one shape and carries the other is rejected
 * before anything is written: the half-course that would result looks finished
 * to a learner and can never issue them a credential.
 *
 * Idempotent, and deliberately conservative about what it overwrites. Courses,
 * chapters and lesson text are the authored source and get refreshed on every
 * run. Questions, chapter quiz and final exam alike, are inserted only when
 * their assessment has none, matching how supabase/seed.sql already behaves.
 * Otherwise an admin's edits in /admin would be silently reverted the next time
 * someone ran a seed.
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
  /**
   * Defaults to true so the four course files that predate exam courses keep
   * their behaviour without an edit. False means the final exam issues the
   * credential and no reviewer is involved.
   */
  requires_assignment?: boolean;
  assignment?: {
    title: string;
    brief_mdx: string;
    criteria: string[];
    min_words: number;
  };
  final_exam?: {
    title: string;
    slug?: string;
    passing_score?: number;
    max_attempts?: number;
    questions: Question[];
  };
};

const COURSES_DIR = join(process.cwd(), "supabase", "courses");

/**
 * Checks that a file actually describes one of the two course shapes.
 *
 * Both halves of this matter. A course whose `requires_assignment` disagrees
 * with the block it carries still seeds cleanly: chapters, lessons and quizzes
 * all land, the course reads as finished, and the learner gets to the end and
 * finds nothing that can release the credential. Catching it here costs a
 * console line; catching it in production costs a support thread and a refund.
 *
 * Returns the problems found rather than throwing, so one run reports every bad
 * file instead of one per attempt.
 */
function validateCourse(course: CourseFile, file: string): string[] {
  const problems: string[] = [];
  const requiresAssignment = course.requires_assignment ?? true;

  if (requiresAssignment && !course.assignment) {
    problems.push(
      course.final_exam
        ? `${file}: has a "final_exam" but requires_assignment is still true (it defaults to true). An exam course has to set "requires_assignment": false, otherwise the credential waits on an assignment review that will never come.`
        : `${file}: requires_assignment is true (it defaults to true) but there is no "assignment" block. Nothing would issue the credential. Add an assignment, or set "requires_assignment": false and add a "final_exam".`,
    );
  }

  if (!requiresAssignment && !course.final_exam) {
    problems.push(
      `${file}: requires_assignment is false but there is no "final_exam" block. Nothing would issue the credential. Add a final_exam, or remove "requires_assignment": false to go back to a reviewed assignment.`,
    );
  }

  if (course.final_exam && (course.final_exam.questions?.length ?? 0) === 0) {
    problems.push(
      `${file}: "final_exam" has no questions. An exam nobody can pass locks the credential just as thoroughly as having no exam at all.`,
    );
  }

  return problems;
}

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Inserts or updates the question set of one assessment.
 *
 * Chapter quizzes and the final exam both come through here on purpose. The
 * rule below is subtle enough that a second copy of it would eventually drift,
 * and what a divergence costs is a learner's in-flight attempt scored as zero.
 *
 * Returns the line to log about the questions, so callers can prefix it with
 * whatever else they want to say about the assessment.
 */
async function syncQuestions(
  db: SupabaseClient,
  assessmentId: string,
  questions: Question[],
  replaceQuestions: boolean,
  label: string,
): Promise<string> {
  const { count } = await db
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);

  // Rewriting the wording of an existing question set must not change the
  // question ids. `attempts.answers` stores the id of every question a
  // learner answered and there is no foreign key behind it, so deleting and
  // re-inserting scores an in-flight attempt as zero and burns one of the
  // learner's allowed tries. When the file still has the same number of
  // questions, which is what a copy edit looks like, update them in place by
  // sort_order and leave the ids alone. `scripts/refresh-seed-content.ts`
  // avoids the same trap for the same reason.
  const sameShape = replaceQuestions && (count ?? 0) === questions.length;

  if (sameShape) {
    const { data: existing, error: readError } = await db
      .from("questions")
      .select("id, sort_order")
      .eq("assessment_id", assessmentId)
      .order("sort_order");
    if (readError) throw readError;

    for (const [qi, q] of questions.entries()) {
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
    return `${questions.length} questions rewritten in place`;
  }

  if (replaceQuestions && (count ?? 0) > 0) {
    // The question count changed, so there is no safe positional match.
    console.warn(
      `   ${label}: question count changed (${count} in the database, ${questions.length} in the file). Replacing them, which invalidates any attempt still in progress on this assessment.`,
    );
    const { error } = await db.from("questions").delete().eq("assessment_id", assessmentId);
    if (error) throw error;
  }

  if (replaceQuestions || (count ?? 0) === 0) {
    const rows = questions.map((q, qi) => ({
      assessment_id: assessmentId,
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
    return `${rows.length} questions`;
  }

  return `questions left alone (${count} already there)`;
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
        requires_assignment: course.requires_assignment ?? true,
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

    const questionSummary = await syncQuestions(
      db,
      quiz.id,
      mod.quiz,
      replaceQuestions,
      `chapter ${index + 1}`,
    );
    console.log(
      `   chapter ${index + 1}: ${mod.lessons.length} lessons, ${questionSummary}`,
    );
  }

  if (course.final_exam) {
    const exam = course.final_exam;
    const { data: examRow, error: examError } = await db
      .from("assessments")
      .upsert(
        {
          slug: exam.slug ?? `${course.slug}-final-exam`,
          certification_id: cert.id,
          // A null module_id is what makes this the final exam rather than one
          // more chapter quiz. src/lib/credentials/issue.ts looks for published
          // assessments on the certification with no module behind them, and a
          // passing attempt on one of those releases the credential. Set it
          // explicitly so a row that was once attached to a chapter is detached
          // rather than left half-converted.
          module_id: null,
          title: exam.title,
          type: "knowledge",
          passing_score: exam.passing_score ?? course.passing_score,
          question_count: exam.questions.length,
          // Unlike a chapter quiz, this one issues the credential, so the
          // retakes are limited.
          max_attempts: exam.max_attempts ?? 3,
          is_published: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (examError) throw examError;

    const examSummary = await syncQuestions(
      db,
      examRow.id,
      exam.questions,
      replaceQuestions,
      "final exam",
    );
    console.log(`   final exam: ${exam.title}, ${examSummary}`);
  }

  // Only assignment courses have one. An exam course that upserted an empty
  // assignment would show a submission form the reviewer queue never expects.
  if (course.assignment) {
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

  // Read and check every chosen file before writing any of them. Failing on
  // the third course after two are already in the database leaves the operator
  // guessing at what landed.
  const parsed = chosen.map((file) => ({
    file,
    course: JSON.parse(readFileSync(join(COURSES_DIR, file), "utf8")) as CourseFile,
  }));
  const problems = parsed.flatMap(({ file, course }) => validateCourse(course, file));
  if (problems.length > 0) {
    console.error("Nothing was written. Fix these first:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const db = client();
  if (replaceQuestions) {
    console.log(
      "--replace-questions: existing quiz and exam questions will be deleted and rewritten from the files.",
    );
  }
  for (const { course } of parsed) {
    await loadCourse(db, course, replaceQuestions);
  }
  console.log("\nAll done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
