/**
 * The deterministic quality gate for authored course content.
 *
 * Everything here is a pure function over a parsed course file, so
 * `scripts/validate-courses.ts` (the reporting wrapper, run by hand) and
 * `tests/unit/course-content.test.ts` (run by `npm run verify`) enforce one
 * copy of the rules. Writing the rules twice is how the script and the test
 * drift, and a gate that disagrees with itself gets ignored.
 *
 * Nothing here touches the database, and nothing imports a server-only module:
 * the test has to be able to import it.
 *
 * The three authoring rules are README §21. The one this file mostly exists
 * for is the third: quiz options roughly the same length, answer key spread
 * across a, b, c and d. Drafts consistently made the correct answer the
 * longest option, which lets a test-wise learner score well having read
 * nothing, and that hollows out the credential the whole product rests on. It
 * is not something a reviewer can hold in their head across 128 questions, so
 * it is measured instead of eyeballed.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { COMPETENCIES, domainOf, type CompetencyDomain } from "@/content/competencies";

// ────────────────────────────────────────────────────────────────────────────
// Thresholds
// ────────────────────────────────────────────────────────────────────────────

/**
 * Correct-is-longest above this fails hard. 25% is what pure guessing gives on
 * a four-option question, so a course at or above it is handing marks to
 * somebody who read nothing. The four shipped courses measure 10.2% overall.
 */
export const MAX_CORRECT_IS_LONGEST = 0.25;

/**
 * The mirror image, and it is a real failure mode rather than a theoretical
 * one: an author correcting a correct-is-longest draft lands on a
 * correct-is-shortest one, because trimming the key is easier than lengthening
 * three distractors. A Basic AI draft reached 48.7% here while measuring 2.6%
 * on the longest direction, and the shortest option alone cleared the pass
 * line on one of its chapter quizzes. Length answers the question in both
 * directions and this file used to measure only one of them.
 *
 * Hard-failing at 40% rather than at the 25% that guessing gives, for the same
 * reason MAX_SINGLE_LETTER_SHARE sits at 40%: several shipped course files
 * measure in the high twenties and low thirties, and a gate that fails
 * everything on the day it lands gets switched off. Above 25% still warns, and
 * the number prints on a green run either way. Once the other course files are
 * rebalanced this should come down to meet MAX_CORRECT_IS_LONGEST.
 */
export const MAX_CORRECT_IS_SHORTEST = 0.4;

/** Above this the shortest-option rate is reported, below it nothing is said. */
export const WARN_CORRECT_IS_SHORTEST = 0.25;

/**
 * No single letter may hold more than this share of a course's answer key. The
 * four shipped courses sit at exactly 25% each, so 40% leaves an author real
 * room while still catching a key that has drifted onto one letter.
 */
export const MAX_SINGLE_LETTER_SHARE = 0.4;

/**
 * The longest option being this many times the shortest is the tell README §21
 * warns about: length alone starts answering the question.
 */
export const OPTION_SPREAD_RATIO = 1.8;

/**
 * One borderline spread is a judgement call, so it is reported and not failed.
 * A fifth of a course being wide is not a judgement call.
 */
export const MAX_WIDE_SPREAD_SHARE = 0.2;

/**
 * Built from their code points rather than written literally, because
 * tests/unit/no-em-dashes.test.ts scans every non-comment line under src and
 * scripts for these two characters. A file whose job is finding them would
 * otherwise fail the test it exists to support.
 */
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const OPTION_IDS = ["a", "b", "c", "d"] as const;
export type OptionId = (typeof OPTION_IDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Shapes
// ────────────────────────────────────────────────────────────────────────────

export type Question = {
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  competency: string;
  explanation: string;
};

/** One assessment's worth of questions, named the way a human would name it. */
export type Assessment = {
  /** "chapter 2 quiz" or "final exam". */
  label: string;
  /** The slug seed-courses.ts will write, so collisions can be checked. */
  slug: string;
  questions: Question[];
};

export type LoadedCourse = {
  /** Bare filename, which is what an author has to go and open. */
  file: string;
  /** Raw text, kept so line numbers can be reported for the em dash scan. */
  raw: string;
  /** Parsed, but not yet known to be well shaped. */
  course: Record<string, unknown>;
};

/** A hard failure or a warning. `where` is empty for a file-level finding. */
export type Finding = {
  file: string;
  where: string;
  message: string;
};

export type StatisticHit = {
  where: string;
  pattern: string;
  sentence: string;
};

export type LessonWords = {
  where: string;
  title: string;
  words: number;
};

export type AssessmentStats = {
  label: string;
  questions: number;
  key: Record<OptionId, number>;
};

export type CourseStats = {
  file: string;
  slug: string;
  questions: number;
  correctIsLongest: number;
  /** Correct option ties for longest. Not a giveaway, but worth seeing. */
  correctTiesLongest: number;
  /** The mirror of correctIsLongest, and just as exploitable. */
  correctIsShortest: number;
  key: Record<OptionId, number>;
  wideSpread: number;
  assessments: AssessmentStats[];
  lessons: LessonWords[];
  totalWords: number;
  statisticHits: StatisticHit[];
};

export type CourseReport = {
  file: string;
  slug: string;
  problems: Finding[];
  warnings: Finding[];
  /** Null when the file is too badly shaped to measure anything from. */
  stats: CourseStats | null;
};

export type Verdict = {
  reports: CourseReport[];
  /** Findings that only exist between files: duplicate slugs and prefixes. */
  crossFile: Finding[];
  overall: {
    courses: number;
    questions: number;
    correctIsLongest: number;
    key: Record<OptionId, number>;
    totalWords: number;
  };
  problems: Finding[];
  warnings: Finding[];
  ok: boolean;
};

// ────────────────────────────────────────────────────────────────────────────
// Reading files
// ────────────────────────────────────────────────────────────────────────────

export const COURSES_DIR = join(process.cwd(), "supabase", "courses");
export const SEED_SQL = join(process.cwd(), "supabase", "seed.sql");

/** Reads and parses supabase/courses/*.json. A syntax error throws, loudly. */
export function loadCourseFiles(dir = COURSES_DIR, only?: string): LoadedCourse[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => (only ? f.startsWith(only) : true))
    .sort();

  return files.map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    let course: Record<string, unknown>;
    try {
      course = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      throw new Error(`${file} is not valid JSON: ${(e as Error).message}`);
    }
    return { file, raw, course };
  });
}

/**
 * The credential prefixes supabase/seed.sql already claims (CAVA, AIF).
 *
 * A prefix is the front half of every credential code a course issues, so two
 * courses sharing one produce codes nobody can tell apart on a CV, and
 * `credential_sequences` hands the two courses overlapping numbers. Read out of
 * the file rather than hardcoded, because a hardcoded copy silently stops
 * matching the day a third course is seeded from SQL.
 *
 * Throws when it finds nothing. If seed.sql is ever reformatted past this
 * pattern the right outcome is a loud failure, not a check that quietly stops
 * catching collisions.
 */
export function seedCredentialPrefixes(path = SEED_SQL): string[] {
  const sql = readFileSync(path, "utf8");
  // The last three columns of a certifications insert row, on their own line:
  //   'CAVA', 1, true
  const matches = [
    ...sql.matchAll(/^\s*'([A-Z][A-Z0-9]{1,15})',\s*-?\d+,\s*(?:true|false)\s*$/gm),
  ];
  const prefixes = [...new Set(matches.map((m) => m[1]))];
  if (prefixes.length === 0) {
    throw new Error(
      `Found no credential_prefix values in ${path}. The certifications insert has been reformatted and this check is no longer looking at anything.`,
    );
  }
  return prefixes;
}

/** The course slugs seed.sql already owns, for the same reason as the prefixes. */
export function seedCourseSlugs(path = SEED_SQL): string[] {
  const sql = readFileSync(path, "utf8");
  const start = sql.indexOf("insert into public.certifications");
  if (start === -1) return [];
  // Loud, like seedCredentialPrefixes above, and for the same reason. A missing
  // terminator makes slice(start, -1) run to the end of the file, which pulls in
  // blog post slugs and anything else quoted on its own line. That does not fail
  // quietly: it makes a legitimate course file collide with a "slug" that is
  // really a blog post, and blocks a seed for a reason nobody can find.
  const end = sql.indexOf("on conflict (slug) do nothing;", start);
  if (end === -1) {
    throw new Error(
      `Found the certifications insert in ${path} but not its "on conflict (slug) do nothing;" terminator. The statement has been reformatted and this check would otherwise scan the rest of the file.`,
    );
  }
  const block = sql.slice(start, end);
  // A slug is the second column of each row, alone on its line and lower-kebab.
  const matches = [...block.matchAll(/^\s*'([a-z][a-z0-9-]{3,})',\s*$/gm)];
  return [...new Set(matches.map((m) => m[1]))];
}

// ────────────────────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────────────────────

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

type Kind = "string" | "number" | "boolean" | "string[]" | "array" | "number-or-null";

function matchesKind(value: unknown, kind: Kind): boolean {
  switch (kind) {
    case "string":
      return typeof value === "string" && value.trim().length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "array":
      return Array.isArray(value);
    case "number-or-null":
      return value === null || (typeof value === "number" && Number.isFinite(value));
  }
}

/** Records a finding when a field seed-courses.ts reads is missing or wrong. */
function field(
  out: Finding[],
  file: string,
  where: string,
  holder: Record<string, unknown>,
  key: string,
  kind: Kind,
): boolean {
  const value = holder[key];
  if (value === undefined) {
    out.push({ file, where, message: `missing "${key}" (seed-courses.ts reads it)` });
    return false;
  }
  if (!matchesKind(value, kind)) {
    const empty = kind === "string" && typeof value === "string" ? " (blank)" : "";
    out.push({
      file,
      where,
      message: `"${key}" should be ${kind}, got ${kindOf(value)}${empty}`,
    });
    return false;
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const LEVELS = ["foundation", "professional", "advanced"];

/**
 * Every field seed-courses.ts reads, for both course shapes.
 *
 * The two-shapes rule is deliberately a second copy of what seed-courses.ts
 * already refuses to write. An author wants to hear about it at authoring
 * time, and the seed script's copy is the one that must never be deleted,
 * because it is the one standing between a half-course and the database.
 */
export function checkSchema(loaded: LoadedCourse): Finding[] {
  const { file, course } = loaded;
  const out: Finding[] = [];

  for (const key of [
    "slug",
    "title",
    "subtitle",
    "level",
    "category",
    "format",
    "summary",
    "description",
    "credential_prefix",
  ]) {
    field(out, file, "", course, key, "string");
  }
  for (const key of ["skills", "outcomes", "roles"]) {
    field(out, file, "", course, key, "string[]");
  }
  field(out, file, "", course, "price_php", "number-or-null");
  field(out, file, "", course, "is_free", "boolean");
  field(out, file, "", course, "passing_score", "number");
  field(out, file, "", course, "sort_order", "number");

  if (typeof course.level === "string" && !LEVELS.includes(course.level)) {
    out.push({
      file,
      where: "",
      message: `"level" is "${course.level}", which is not one of ${LEVELS.join(", ")}. certifications.level carries a check constraint, so the database would reject the seed.`,
    });
  }

  if (course.requires_assignment !== undefined && typeof course.requires_assignment !== "boolean") {
    out.push({
      file,
      where: "",
      message: `"requires_assignment" should be boolean, got ${kindOf(course.requires_assignment)}`,
    });
  }

  // The two shapes. A course whose declared shape disagrees with the block it
  // carries seeds cleanly, reads as finished to the learner, and can never
  // release their credential.
  const requiresAssignment = (course.requires_assignment as boolean | undefined) ?? true;
  const assignment = asRecord(course.assignment);
  const finalExam = asRecord(course.final_exam);

  if (requiresAssignment && !assignment) {
    out.push({
      file,
      where: "",
      message: finalExam
        ? 'has a "final_exam" but requires_assignment is still true (it defaults to true). An exam course has to set "requires_assignment": false, otherwise the credential waits on a review that will never come.'
        : 'requires_assignment is true (it defaults to true) but there is no "assignment" block. Nothing would issue the credential.',
    });
  }
  if (!requiresAssignment && !finalExam) {
    out.push({
      file,
      where: "",
      message:
        'requires_assignment is false but there is no "final_exam" block. Nothing would issue the credential.',
    });
  }

  // Carrying both blocks seeds cleanly and is worse than either mistake alone,
  // because the half that does nothing is the half that looks decisive.
  // maybeIssueCredential() branches on certifications.requires_assignment and
  // never looks at the other route: on an assignment course the final exam is
  // published with module_id null, so a learner passes the thing that looks
  // like the end of the course and no credential arrives. On an exam course
  // the assignment shows a submission form feeding a review queue whose
  // approval releases nothing.
  if (assignment && finalExam) {
    out.push({
      file,
      where: "",
      message: requiresAssignment
        ? 'carries both an "assignment" and a "final_exam" while requires_assignment is true. Only the assignment can issue the credential, so the final exam is an ending that ends nothing. Drop one.'
        : 'carries both a "final_exam" and an "assignment" while requires_assignment is false. Only the exam can issue the credential, so the assignment feeds a review queue whose approval releases nothing. Drop one.',
    });
  }

  if (assignment) {
    field(out, file, "assignment", assignment, "title", "string");
    field(out, file, "assignment", assignment, "brief_mdx", "string");
    field(out, file, "assignment", assignment, "min_words", "number");
    if (field(out, file, "assignment", assignment, "criteria", "string[]")) {
      if ((assignment.criteria as string[]).length === 0) {
        out.push({
          file,
          where: "assignment",
          message: "has no criteria. A reviewer returning work has nothing to point at.",
        });
      }
    }
  }

  if (finalExam) {
    field(out, file, "final exam", finalExam, "title", "string");
    if (finalExam.slug !== undefined) field(out, file, "final exam", finalExam, "slug", "string");
    if (finalExam.passing_score !== undefined) {
      field(out, file, "final exam", finalExam, "passing_score", "number");
    }
    if (finalExam.max_attempts !== undefined) {
      field(out, file, "final exam", finalExam, "max_attempts", "number");
    }
    if (field(out, file, "final exam", finalExam, "questions", "array")) {
      if ((finalExam.questions as unknown[]).length === 0) {
        out.push({
          file,
          where: "final exam",
          message:
            "has no questions. An exam nobody can pass locks the credential just as thoroughly as having no exam at all.",
        });
      }
    }
  }

  if (!field(out, file, "", course, "modules", "array")) return out;
  const modules = course.modules as unknown[];
  if (modules.length === 0) {
    out.push({ file, where: "", message: '"modules" is empty. There is no course here.' });
    return out;
  }

  const moduleSlugs = new Map<string, number>();
  modules.forEach((rawModule, mi) => {
    const where = `chapter ${mi + 1}`;
    const mod = asRecord(rawModule);
    if (!mod) {
      out.push({ file, where, message: `should be an object, got ${kindOf(rawModule)}` });
      return;
    }
    field(out, file, where, mod, "title", "string");
    field(out, file, where, mod, "description", "string");

    if (field(out, file, where, mod, "slug", "string")) {
      const slug = mod.slug as string;
      // Chapters are matched on slug, never on title (README §21). Two chapters
      // sharing one means the second silently overwrites the first's rows.
      const first = moduleSlugs.get(slug);
      if (first !== undefined) {
        out.push({
          file,
          where,
          message: `chapter slug "${slug}" is already chapter ${first}'s. Chapters are matched on slug, so the second would overwrite the first.`,
        });
      } else {
        moduleSlugs.set(slug, mi + 1);
      }
    }

    if (field(out, file, where, mod, "lessons", "array")) {
      const lessons = mod.lessons as unknown[];
      if (lessons.length === 0) out.push({ file, where, message: "has no lessons" });

      const lessonSlugs = new Set<string>();
      lessons.forEach((rawLesson, li) => {
        const lwhere = `${where}, lesson ${li + 1}`;
        const lesson = asRecord(rawLesson);
        if (!lesson) {
          out.push({
            file,
            where: lwhere,
            message: `should be an object, got ${kindOf(rawLesson)}`,
          });
          return;
        }
        field(out, file, lwhere, lesson, "title", "string");
        field(out, file, lwhere, lesson, "content_mdx", "string");
        field(out, file, lwhere, lesson, "duration_minutes", "number");
        if (lesson.is_preview !== undefined) {
          field(out, file, lwhere, lesson, "is_preview", "boolean");
        }
        if (field(out, file, lwhere, lesson, "slug", "string")) {
          const slug = lesson.slug as string;
          // lessons is unique on (module_id, slug), so a duplicate is an upsert
          // onto itself: the second lesson's text wins and the first vanishes
          // without an error anywhere.
          if (lessonSlugs.has(slug)) {
            out.push({
              file,
              where: lwhere,
              message: `lesson slug "${slug}" is used twice in this chapter. lessons is unique on (module_id, slug), so one would overwrite the other.`,
            });
          }
          lessonSlugs.add(slug);
        }
      });
    }

    if (field(out, file, where, mod, "quiz", "array")) {
      if ((mod.quiz as unknown[]).length === 0) {
        out.push({
          file,
          where,
          message:
            "has an empty quiz. The assignment unlocks only once every chapter quiz is passed, so a quiz with no questions is a gate nobody can get through.",
        });
      }
    }
  });

  return out;
}

/**
 * True when the file is shaped well enough for the measurements to run without
 * guessing. Statistics computed off a broken file are worse than no statistics.
 */
export function structurallySound(course: Record<string, unknown>): boolean {
  const modules = course.modules;
  if (!Array.isArray(modules) || modules.length === 0) return false;
  for (const rawModule of modules) {
    const mod = asRecord(rawModule);
    if (!mod || !Array.isArray(mod.lessons) || !Array.isArray(mod.quiz)) return false;
    if (!mod.lessons.every((l) => asRecord(l) !== null)) return false;
    if (!mod.quiz.every(isQuestionShaped)) return false;
  }
  const exam = asRecord(course.final_exam);
  if (exam) {
    if (!Array.isArray(exam.questions)) return false;
    if (!exam.questions.every(isQuestionShaped)) return false;
  }
  return true;
}

/**
 * Reports every question that is too malformed for the rules below to read.
 *
 * This exists because `assessmentsOf` filters unshaped questions out before
 * `checkAssessment` ever sees them, and `structurallySound` then refuses to
 * measure the file. Without this, a course with one broken question produced a
 * report with no failures, no statistics and a PASS: an author could set
 * `correct_option_id` to null, run the gate the README points them at, see it
 * go green, and seed a quiz that scores zero for everyone who sits it.
 *
 * A malformed question is a hard failure, not a warning. Nothing downstream can
 * do anything useful with it.
 */
export function checkQuestionShapes(loaded: LoadedCourse): Finding[] {
  const out: Finding[] = [];
  const report = (where: string, value: unknown) => {
    if (isQuestionShaped(value)) return;
    out.push({
      file: loaded.file,
      where,
      message:
        "is not a usable question. It needs a string prompt, a string correct_option_id, and a non-empty options array whose entries each have a string id and a string text. Nothing else can be checked until this is fixed.",
    });
  };

  const modules = Array.isArray(loaded.course.modules) ? loaded.course.modules : [];
  modules.forEach((rawModule, mi) => {
    const mod = asRecord(rawModule);
    if (!mod || !Array.isArray(mod.quiz)) return;
    mod.quiz.forEach((q, qi) => report(`chapter ${mi + 1} quiz, question ${qi + 1}`, q));
  });

  const exam = asRecord(loaded.course.final_exam);
  if (exam && Array.isArray(exam.questions)) {
    exam.questions.forEach((q, qi) => report(`final exam, question ${qi + 1}`, q));
  }

  return out;
}

function isQuestionShaped(value: unknown): boolean {
  const q = asRecord(value);
  if (!q) return false;
  if (typeof q.prompt !== "string") return false;
  if (typeof q.correct_option_id !== "string") return false;
  if (!Array.isArray(q.options) || q.options.length === 0) return false;
  return q.options.every((o) => {
    const opt = asRecord(o);
    return opt !== null && typeof opt.id === "string" && typeof opt.text === "string";
  });
}

/**
 * Every assessment in the file, in the order a learner meets them, labelled
 * and carrying the slug seed-courses.ts will actually write.
 */
export function assessmentsOf(course: Record<string, unknown>): Assessment[] {
  const slug = typeof course.slug === "string" ? course.slug : "unknown";
  const out: Assessment[] = [];

  const modules = Array.isArray(course.modules) ? course.modules : [];
  modules.forEach((rawModule, mi) => {
    const mod = asRecord(rawModule);
    if (!mod || !Array.isArray(mod.quiz)) return;
    out.push({
      label: `chapter ${mi + 1} quiz`,
      slug: `${slug}-chapter-${mi + 1}`,
      questions: mod.quiz.filter(isQuestionShaped) as Question[],
    });
  });

  const exam = asRecord(course.final_exam);
  if (exam && Array.isArray(exam.questions)) {
    out.push({
      label: "final exam",
      slug: typeof exam.slug === "string" ? exam.slug : `${slug}-final-exam`,
      questions: exam.questions.filter(isQuestionShaped) as Question[],
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Questions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Whether the correct option is, on its own, the longest one offered.
 *
 * A tie does not count. Two options of equal length tell a test-wise learner
 * nothing, and counting ties would push the measured rate above what the
 * README's 11% figure was calculated on, which would make the number lie.
 */
export function correctIsLongest(q: Question): boolean {
  const lengths = q.options.map((o) => o.text.trim().length);
  const longest = Math.max(...lengths);
  if (lengths.filter((l) => l === longest).length > 1) return false;
  const correct = q.options.find((o) => o.id === q.correct_option_id);
  return correct !== undefined && correct.text.trim().length === longest;
}

/**
 * Whether the correct option is, on its own, the shortest one offered.
 *
 * Same rule about ties as `correctIsLongest`, and for the same reason: two
 * options of equal length tell a test-wise learner nothing.
 */
export function correctIsShortest(q: Question): boolean {
  const lengths = q.options.map((o) => o.text.trim().length);
  const shortest = Math.min(...lengths);
  if (lengths.filter((l) => l === shortest).length > 1) return false;
  const correct = q.options.find((o) => o.id === q.correct_option_id);
  return correct !== undefined && correct.text.trim().length === shortest;
}

/** Longest option divided by shortest. 1 means every option is the same length. */
export function optionSpread(q: Question): number {
  const lengths = q.options.map((o) => o.text.trim().length);
  const shortest = Math.min(...lengths);
  if (shortest === 0) return Infinity;
  return Math.max(...lengths) / shortest;
}

/**
 * Checks one assessment's questions.
 *
 * The two competency rules are the ones that would otherwise reach a
 * credential. An unknown competency scores into a bucket nothing renders, so
 * the breakdown on the certificate loses that question without saying so. A
 * quiz mixing domains, a finance question scored against 'prompting', puts a
 * competency on the credential that the course never taught.
 */
export function checkAssessment(file: string, assessment: Assessment): Finding[] {
  const out: Finding[] = [];
  const seenPrompts = new Map<string, number>();
  const domains = new Map<CompetencyDomain, string[]>();

  assessment.questions.forEach((q, qi) => {
    const where = `${assessment.label}, question ${qi + 1}`;

    const ids = q.options.map((o) => o.id);
    if (q.options.length !== 4 || OPTION_IDS.some((id, i) => ids[i] !== id)) {
      out.push({
        file,
        where,
        message: `options should be exactly a, b, c, d in order, got [${ids.join(", ")}]`,
      });
    }
    if (!ids.includes(q.correct_option_id)) {
      out.push({
        file,
        where,
        message: `correct_option_id is "${q.correct_option_id}", which is not one of the options offered. Every attempt at this question scores zero.`,
      });
    }

    const texts = q.options.map((o) => o.text.trim());
    texts.forEach((text, oi) => {
      if (text.length === 0) out.push({ file, where, message: `option ${ids[oi]} is empty` });
    });
    const repeated = texts.find((t, i) => t.length > 0 && texts.indexOf(t) !== i);
    if (repeated !== undefined) {
      out.push({
        file,
        where,
        message: `two options have the same text: "${truncate(repeated, 60)}". Only one of them can be the key, so the question has two answers a learner cannot tell apart.`,
      });
    }

    if (typeof q.explanation !== "string" || q.explanation.trim().length === 0) {
      out.push({
        file,
        where,
        message:
          "has no explanation. The explanation is the only teaching a learner gets out of a wrong answer.",
      });
    }

    if (typeof q.competency !== "string" || q.competency.trim().length === 0) {
      out.push({ file, where, message: "has no competency" });
    } else if (!(q.competency in COMPETENCIES)) {
      out.push({
        file,
        where,
        message: `competency "${q.competency}" is not in src/content/competencies.ts. It would score into a bucket the credential breakdown never renders, so the question is quietly worth nothing to the learner.`,
      });
    } else {
      const domain = domainOf(q.competency) as CompetencyDomain;
      const asked = domains.get(domain) ?? [];
      asked.push(`q${qi + 1} (${q.competency})`);
      domains.set(domain, asked);
    }

    const prompt = q.prompt.trim().toLowerCase();
    const first = seenPrompts.get(prompt);
    if (first !== undefined) {
      out.push({
        file,
        where,
        message: `is the same prompt as question ${first}: "${truncate(q.prompt, 70)}"`,
      });
    } else {
      seenPrompts.set(prompt, qi + 1);
    }
  });

  if (domains.size > 1) {
    const spread = [...domains.entries()]
      .map(([domain, asked]) => `${domain}: ${asked.join(", ")}`)
      .join(" | ");
    out.push({
      file,
      where: assessment.label,
      message: `draws on more than one competency domain, which is a content bug rather than a typo. ${spread}`,
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Em dashes
// ────────────────────────────────────────────────────────────────────────────

/**
 * A course file is entirely content, so unlike the source scan in
 * tests/unit/no-em-dashes.test.ts there is nothing to exempt here: every line
 * is read by a learner. En dashes are caught too, matching that test, since
 * the objection was to the punctuation reading as machine-written either way.
 */
export function checkNoEmDashes(loaded: LoadedCourse): Finding[] {
  const out: Finding[] = [];
  loaded.raw.split(/\r?\n/).forEach((line, i) => {
    if (!line.includes(EM_DASH) && !line.includes(EN_DASH)) return;
    out.push({
      file: loaded.file,
      where: `line ${i + 1}`,
      message: `contains ${line.includes(EM_DASH) ? "an em dash" : "an en dash"}: ${truncate(line, 100)}`,
    });
  });
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Invented statistics
// ────────────────────────────────────────────────────────────────────────────

/**
 * README §21 rule 1: never invent a statistic.
 *
 * A warning and never a failure, because a legitimate sentence contains a
 * number all the time. Two of the shipped courses teach *about* invented
 * statistics and have to quote one to do it, and a lesson about a 15% off
 * promo has to be able to say 15%. So every hit is printed with its sentence
 * and a human decides. The value is that nobody can say they did not see it.
 *
 * "most" deliberately skips the superlative ("the most useful thing"), which
 * is not a quantity claim at all. What is left is "most people", "most of the
 * work": vague quantities a reader hears as a measurement.
 */
const STATISTIC_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "percentage", re: /\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s+percent\b/i },
  {
    name: "X out of Y",
    re: /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:out of|in)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  { name: "nine times out of ten", re: /\bnine times out of ten\b/i },
  { name: "studies show", re: /\bstudies\s+(?:show|shows|showed|found|say|suggest)\b/i },
  { name: "research says", re: /\bresearch\s+(?:says|shows|showed|found|suggests)\b/i },
  { name: "half of all", re: /\bhalf of (?:all|them|the|these|those|us|people)\b/i },
  { name: "most", re: /(?<!\b(?:the|at|its|your|our|their|his|her)\s)\bmost\b/i },
];

/** Splits prose into sentences well enough to quote one back at an author. */
function sentencesOf(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function scanForStatistics(where: string, text: string): StatisticHit[] {
  const out: StatisticHit[] = [];
  for (const sentence of sentencesOf(text)) {
    for (const { name, re } of STATISTIC_PATTERNS) {
      if (re.test(sentence)) out.push({ where, pattern: name, sentence: truncate(sentence, 150) });
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Measurement
// ────────────────────────────────────────────────────────────────────────────

/**
 * Words in a lesson, counted the rough way: whitespace-separated tokens that
 * contain a letter or a digit. Markdown syntax inflates it slightly and that
 * is fine, because nothing fails on this number. It exists so an author can
 * see that one chapter is a third the length of the others.
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

function emptyKey(): Record<OptionId, number> {
  return { a: 0, b: 0, c: 0, d: 0 };
}

function isOptionId(id: string): id is OptionId {
  return (OPTION_IDS as readonly string[]).includes(id);
}

export function measure(loaded: LoadedCourse): CourseStats {
  const { file, course } = loaded;
  const stats: CourseStats = {
    file,
    slug: typeof course.slug === "string" ? course.slug : file,
    questions: 0,
    correctIsLongest: 0,
    correctTiesLongest: 0,
    correctIsShortest: 0,
    key: emptyKey(),
    wideSpread: 0,
    assessments: [],
    lessons: [],
    totalWords: 0,
    statisticHits: [],
  };

  for (const assessment of assessmentsOf(course)) {
    const key = emptyKey();
    for (const q of assessment.questions) {
      stats.questions++;
      if (isOptionId(q.correct_option_id)) {
        key[q.correct_option_id]++;
        stats.key[q.correct_option_id]++;
      }
      if (correctIsLongest(q)) {
        stats.correctIsLongest++;
      } else {
        const lengths = q.options.map((o) => o.text.trim().length);
        const correct = q.options.find((o) => o.id === q.correct_option_id);
        if (correct && correct.text.trim().length === Math.max(...lengths)) {
          stats.correctTiesLongest++;
        }
      }
      if (correctIsShortest(q)) stats.correctIsShortest++;
      if (optionSpread(q) > OPTION_SPREAD_RATIO) stats.wideSpread++;
    }
    stats.assessments.push({ label: assessment.label, questions: assessment.questions.length, key });
  }

  const modules = Array.isArray(course.modules) ? course.modules : [];
  modules.forEach((rawModule, mi) => {
    const mod = asRecord(rawModule);
    if (!mod || !Array.isArray(mod.lessons)) return;
    mod.lessons.forEach((rawLesson, li) => {
      const lesson = asRecord(rawLesson);
      if (!lesson || typeof lesson.content_mdx !== "string") return;
      const where = `chapter ${mi + 1}, lesson ${li + 1}`;
      const words = countWords(lesson.content_mdx);
      stats.lessons.push({
        where,
        title: typeof lesson.title === "string" ? lesson.title : "(untitled)",
        words,
      });
      stats.totalWords += words;
      stats.statisticHits.push(...scanForStatistics(where, lesson.content_mdx));
    });
  });

  return stats;
}

/**
 * Turns the measurements into verdicts.
 *
 * Split out from `measure` so the numbers can be printed whether or not they
 * pass. The point of the summary table is that someone reads the answer-key
 * distribution on a green run too.
 */
export function judge(stats: CourseStats): { problems: Finding[]; warnings: Finding[] } {
  const problems: Finding[] = [];
  const warnings: Finding[] = [];
  const { file, questions } = stats;
  if (questions === 0) return { problems, warnings };

  const longestRate = stats.correctIsLongest / questions;
  if (longestRate > MAX_CORRECT_IS_LONGEST) {
    problems.push({
      file,
      where: "answer key",
      message: `the correct answer is the longest option in ${stats.correctIsLongest} of ${questions} questions (${pct(longestRate)}), above the ${pct(MAX_CORRECT_IS_LONGEST)} that guessing already gives. A learner who reads nothing and picks the longest option beats the pass mark.`,
    });
  } else if (longestRate > MAX_CORRECT_IS_LONGEST * 0.75) {
    warnings.push({
      file,
      where: "answer key",
      message: `correct-is-longest is ${stats.correctIsLongest} of ${questions} (${pct(longestRate)}), close to the ${pct(MAX_CORRECT_IS_LONGEST)} limit. The shipped courses sit near 10%.`,
    });
  }

  const shortestRate = stats.correctIsShortest / questions;
  if (shortestRate > MAX_CORRECT_IS_SHORTEST) {
    problems.push({
      file,
      where: "answer key",
      message: `the correct answer is the shortest option in ${stats.correctIsShortest} of ${questions} questions (${pct(shortestRate)}), above the ${pct(MAX_CORRECT_IS_SHORTEST)} limit. A learner who reads nothing and picks the shortest option scores off length alone, which is correct-is-longest wearing a different coat.`,
    });
  } else if (shortestRate > WARN_CORRECT_IS_SHORTEST) {
    warnings.push({
      file,
      where: "answer key",
      message: `correct-is-shortest is ${stats.correctIsShortest} of ${questions} (${pct(shortestRate)}), above the ${pct(WARN_CORRECT_IS_SHORTEST)} that guessing gives. Lengthen the key or trim the distractors, whichever is honest.`,
    });
  }

  for (const id of OPTION_IDS) {
    const share = stats.key[id] / questions;
    if (share > MAX_SINGLE_LETTER_SHARE) {
      problems.push({
        file,
        where: "answer key",
        message: `"${id}" is the answer to ${stats.key[id]} of ${questions} questions (${pct(share)}), above the ${pct(MAX_SINGLE_LETTER_SHARE)} limit. Spread the key across a, b, c and d.`,
      });
    }
  }

  const wideRate = stats.wideSpread / questions;
  if (wideRate > MAX_WIDE_SPREAD_SHARE) {
    problems.push({
      file,
      where: "option lengths",
      message: `${stats.wideSpread} of ${questions} questions (${pct(wideRate)}) have a longest option more than ${OPTION_SPREAD_RATIO}x the shortest, above the ${pct(MAX_WIDE_SPREAD_SHARE)} limit. Length is answering the question.`,
    });
  } else if (stats.wideSpread > 0) {
    warnings.push({
      file,
      where: "option lengths",
      message: `${stats.wideSpread} of ${questions} questions have a longest option more than ${OPTION_SPREAD_RATIO}x the shortest. Borderline on its own, so read them.`,
    });
  }

  return { problems, warnings };
}

/** The individual questions behind the option-spread number, for the report. */
export function wideSpreadQuestions(
  course: Record<string, unknown>,
): { where: string; spread: number; prompt: string }[] {
  const out: { where: string; spread: number; prompt: string }[] = [];
  for (const assessment of assessmentsOf(course)) {
    assessment.questions.forEach((q, qi) => {
      const spread = optionSpread(q);
      if (spread > OPTION_SPREAD_RATIO) {
        out.push({
          where: `${assessment.label}, question ${qi + 1}`,
          spread,
          prompt: truncate(q.prompt, 80),
        });
      }
    });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// The whole run
// ────────────────────────────────────────────────────────────────────────────

export function checkCourse(loaded: LoadedCourse): CourseReport {
  const problems = [
    ...checkSchema(loaded),
    ...checkQuestionShapes(loaded),
    ...checkNoEmDashes(loaded),
  ];
  const warnings: Finding[] = [];

  for (const assessment of assessmentsOf(loaded.course)) {
    problems.push(...checkAssessment(loaded.file, assessment));
  }

  let stats: CourseStats | null = null;
  if (structurallySound(loaded.course)) {
    stats = measure(loaded);
    const verdict = judge(stats);
    problems.push(...verdict.problems);
    warnings.push(...verdict.warnings);
  }

  return {
    file: loaded.file,
    slug: typeof loaded.course.slug === "string" ? loaded.course.slug : loaded.file,
    problems,
    warnings,
    stats,
  };
}

/**
 * The findings that only exist between files.
 *
 * `seedPrefixes` and `seedSlugs` are what supabase/seed.sql already owns. They
 * are passed in rather than read here so the caller owns all the file access
 * and this stays a pure function.
 */
export function checkAcrossFiles(
  loaded: LoadedCourse[],
  seedPrefixes: string[],
  seedSlugs: string[],
): Finding[] {
  const out: Finding[] = [];
  const slugs = new Map<string, string>();
  const prefixes = new Map<string, string>();
  const assessmentSlugs = new Map<string, string>();

  for (const seeded of seedPrefixes) prefixes.set(seeded, "supabase/seed.sql");
  for (const seeded of seedSlugs) slugs.set(seeded, "supabase/seed.sql");

  for (const { file, course } of loaded) {
    if (typeof course.slug === "string") {
      const owner = slugs.get(course.slug);
      if (owner) {
        out.push({
          file,
          where: "",
          message: `course slug "${course.slug}" already belongs to ${owner}. certifications is upserted on slug, so one course would overwrite the other.`,
        });
      } else {
        slugs.set(course.slug, file);
      }
    }

    if (typeof course.credential_prefix === "string") {
      const owner = prefixes.get(course.credential_prefix);
      if (owner) {
        out.push({
          file,
          where: "",
          message: `credential_prefix "${course.credential_prefix}" already belongs to ${owner}. Two courses sharing a prefix issue codes nobody can tell apart on a CV, and credential_sequences hands them overlapping numbers.`,
        });
      } else {
        prefixes.set(course.credential_prefix, file);
      }
    }

    // Chapter quiz slugs are derived from the course slug, and a final exam
    // slug can be written by hand, so an author can collide the two.
    // assessments is upserted on slug: a collision moves a chapter's questions
    // onto the exam that issues the credential.
    for (const assessment of assessmentsOf(course)) {
      const owner = assessmentSlugs.get(assessment.slug);
      if (owner) {
        out.push({
          file,
          where: assessment.label,
          message: `assessment slug "${assessment.slug}" already belongs to ${owner}. assessments is upserted on slug, so these two would become one.`,
        });
      } else {
        assessmentSlugs.set(assessment.slug, `${file} (${assessment.label})`);
      }
    }
  }

  return out;
}

export function checkAll(
  loaded: LoadedCourse[],
  seedPrefixes: string[],
  seedSlugs: string[],
): Verdict {
  const reports = loaded.map(checkCourse);
  const crossFile = checkAcrossFiles(loaded, seedPrefixes, seedSlugs);

  const measured = reports.map((r) => r.stats).filter((s): s is CourseStats => s !== null);
  const overall = {
    courses: reports.length,
    questions: sum(measured.map((s) => s.questions)),
    correctIsLongest: sum(measured.map((s) => s.correctIsLongest)),
    key: OPTION_IDS.reduce((acc, id) => {
      acc[id] = sum(measured.map((s) => s.key[id]));
      return acc;
    }, emptyKey()),
    totalWords: sum(measured.map((s) => s.totalWords)),
  };

  const problems = [...crossFile, ...reports.flatMap((r) => r.problems)];
  const warnings = reports.flatMap((r) => r.warnings);

  // The overall rate is checked as well as the per-course one. Four courses
  // each sitting just under the limit is the same problem as one over it.
  if (overall.questions > 0) {
    const rate = overall.correctIsLongest / overall.questions;
    if (rate > MAX_CORRECT_IS_LONGEST) {
      problems.push({
        file: "all courses",
        where: "answer key",
        message: `across every course the correct answer is the longest option in ${overall.correctIsLongest} of ${overall.questions} questions (${pct(rate)}), above the ${pct(MAX_CORRECT_IS_LONGEST)} that guessing gives.`,
      });
    }
  }

  return { reports, crossFile, overall, problems, warnings, ok: problems.length === 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Formatting, shared so the script and the test phrase a number the same way
// ────────────────────────────────────────────────────────────────────────────

export function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 3)}...`;
}
