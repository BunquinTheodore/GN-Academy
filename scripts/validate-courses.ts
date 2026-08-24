/**
 * The quality gate for authored course content, run by hand:
 *
 *   npx tsx scripts/validate-courses.ts                 # every course file
 *   npx tsx scripts/validate-courses.ts ai-essentials   # one
 *
 * It reads supabase/courses/*.json and supabase/seed.sql and touches nothing
 * else. No database client is created here on purpose: this is the check you
 * want to be able to run on a laptop with no credentials, at three in the
 * morning, before deciding whether a draft is finished.
 *
 * Exits non-zero when it finds a hard failure. Warnings never fail the run;
 * they are numbers a human has to look at and judge.
 *
 * The rules live in src/lib/courses/content-checks.ts, which
 * tests/unit/course-content.test.ts imports as well, so `npm run verify`
 * enforces exactly what this prints. This file is only the reporting wrapper.
 *
 * The summary table prints on a green run too, and that is the point. The
 * answer-key distribution and the correct-is-longest rate are the numbers the
 * credential's worth rests on (README §21), so somebody should be able to run
 * this and read them without first having to break something.
 */
import {
  checkAll,
  loadCourseFiles,
  pct,
  seedCourseSlugs,
  seedCredentialPrefixes,
  wideSpreadQuestions,
  type CourseStats,
  type Finding,
  type LoadedCourse,
} from "@/lib/courses/content-checks";

const OPTION_IDS = ["a", "b", "c", "d"] as const;

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

function rule(width = 92): string {
  return "-".repeat(width);
}

function heading(text: string) {
  console.log(`\n${text}`);
  console.log(rule(Math.max(text.length, 60)));
}

function printFindings(label: string, findings: Finding[]) {
  if (findings.length === 0) return;
  heading(`${label} (${findings.length})`);
  let currentFile = "";
  for (const finding of findings) {
    if (finding.file !== currentFile) {
      currentFile = finding.file;
      console.log(`\n  ${currentFile}`);
    }
    console.log(`    ${finding.where ? `${finding.where}: ` : ""}${finding.message}`);
  }
}

/**
 * The table someone runs this for. One row per course, plus the totals.
 *
 * The four key columns are counts and not percentages because a count is what
 * an author acts on: "b is the answer eleven times" is a fixable sentence,
 * "34.4%" is not.
 */
function printSummary(stats: CourseStats[]) {
  heading("Summary");
  const header =
    pad("course", 34) +
    padLeft("qs", 4) +
    padLeft("longest", 14) +
    padLeft("shortest", 14) +
    padLeft("a", 4) +
    padLeft("b", 4) +
    padLeft("c", 4) +
    padLeft("d", 4) +
    padLeft("top letter", 12) +
    padLeft("wide", 9) +
    padLeft("words", 8);
  console.log(header);
  console.log(rule(header.length));

  for (const s of stats) {
    const top = Math.max(...OPTION_IDS.map((id) => s.key[id]));
    console.log(
      pad(s.slug, 34) +
        padLeft(String(s.questions), 4) +
        padLeft(
          s.questions ? `${s.correctIsLongest} (${pct(s.correctIsLongest / s.questions)})` : "n/a",
          14,
        ) +
        padLeft(
          s.questions ? `${s.correctIsShortest} (${pct(s.correctIsShortest / s.questions)})` : "n/a",
          14,
        ) +
        OPTION_IDS.map((id) => padLeft(String(s.key[id]), 4)).join("") +
        padLeft(s.questions ? pct(top / s.questions) : "n/a", 12) +
        padLeft(String(s.wideSpread), 9) +
        padLeft(s.totalWords.toLocaleString("en-US"), 8),
    );
  }

  const questions = stats.reduce((a, s) => a + s.questions, 0);
  const longest = stats.reduce((a, s) => a + s.correctIsLongest, 0);
  const shortest = stats.reduce((a, s) => a + s.correctIsShortest, 0);
  const wide = stats.reduce((a, s) => a + s.wideSpread, 0);
  const words = stats.reduce((a, s) => a + s.totalWords, 0);
  const key = OPTION_IDS.map((id) => stats.reduce((a, s) => a + s.key[id], 0));
  const top = Math.max(...key);

  console.log(rule(header.length));
  console.log(
    pad(stats.length === 1 ? "total" : `all ${stats.length} courses`, 34) +
      padLeft(String(questions), 4) +
      padLeft(questions ? `${longest} (${pct(longest / questions)})` : "n/a", 14) +
      padLeft(questions ? `${shortest} (${pct(shortest / questions)})` : "n/a", 14) +
      key.map((n) => padLeft(String(n), 4)).join("") +
      padLeft(questions ? pct(top / questions) : "n/a", 12) +
      padLeft(String(wide), 9) +
      padLeft(words.toLocaleString("en-US"), 8),
  );
  console.log(
    "\n  longest    correct answer is, on its own, the longest option offered. Guessing gives 25%.",
  );
  console.log("  top letter share of the course's answer key held by its most common letter.");
  console.log("  wide       questions whose longest option is more than 1.8x the shortest.");
}

/** Per-assessment answer key, which is where an author actually fixes a skew. */
function printKeyDistribution(stats: CourseStats[]) {
  heading("Answer key by assessment");
  for (const s of stats) {
    console.log(`\n  ${s.slug}`);
    for (const a of s.assessments) {
      const spread = OPTION_IDS.map((id) => `${id}:${a.key[id]}`).join("  ");
      console.log(`    ${pad(a.label, 18)} ${padLeft(String(a.questions), 3)} questions   ${spread}`);
    }
  }
}

function printLessonWords(stats: CourseStats[]) {
  heading("Lesson word counts");
  for (const s of stats) {
    console.log(`\n  ${s.slug}  (${s.totalWords.toLocaleString("en-US")} words total)`);
    for (const lesson of s.lessons) {
      console.log(
        `    ${pad(lesson.where, 24)}${padLeft(lesson.words.toLocaleString("en-US"), 7)}  ${lesson.title}`,
      );
    }
  }
}

/**
 * Every hit from the invented-statistic scan, printed in full.
 *
 * This is a warning and never a failure: a legitimate sentence contains a
 * number all the time, and two of the courses teach about invented statistics
 * by quoting one. But every hit gets printed, because the only version of this
 * check that is worth anything is the one where a human has read them all.
 */
function printStatisticHits(stats: CourseStats[]) {
  const total = stats.reduce((a, s) => a + s.statisticHits.length, 0);
  heading(`Possible invented statistics (${total})`);
  console.log(
    "  Not failures. README §21 rule 1 is never invent a statistic, so read each one\n" +
      "  and confirm the number is quoted, hypothetical, or genuinely known.\n",
  );
  for (const s of stats) {
    if (s.statisticHits.length === 0) {
      console.log(`  ${s.slug}: none`);
      continue;
    }
    console.log(`  ${s.slug} (${s.statisticHits.length})`);
    for (const hit of s.statisticHits) {
      console.log(`    ${pad(hit.where, 24)} [${hit.pattern}] ${hit.sentence}`);
    }
    console.log("");
  }
}

/** The individual wide questions, so a reported count leads somewhere. */
function printWideSpread(loaded: LoadedCourse[]) {
  const rows = loaded.flatMap(({ file, course }) =>
    wideSpreadQuestions(course).map((q) => ({ file, ...q })),
  );
  if (rows.length === 0) return;
  heading(`Questions whose options are uneven in length (${rows.length})`);
  for (const row of rows) {
    console.log(`  ${row.file}`);
    console.log(`    ${row.where} (${row.spread.toFixed(2)}x): ${row.prompt}`);
  }
}

function main() {
  const only = process.argv.slice(2).find((a) => !a.startsWith("--"));

  let loaded: LoadedCourse[];
  let seedPrefixes: string[];
  let seedSlugs: string[];
  try {
    loaded = loadCourseFiles(undefined, only);
    seedPrefixes = seedCredentialPrefixes();
    seedSlugs = seedCourseSlugs();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  if (loaded.length === 0) {
    console.error(`No course files matched${only ? ` "${only}"` : ""} in supabase/courses.`);
    process.exit(1);
  }

  console.log(
    `Checking ${loaded.length} course file${loaded.length === 1 ? "" : "s"}: ${loaded
      .map((l) => l.file)
      .join(", ")}`,
  );
  console.log(`Prefixes already taken by supabase/seed.sql: ${seedPrefixes.join(", ")}`);

  const verdict = checkAll(loaded, seedPrefixes, seedSlugs);
  const measured = verdict.reports
    .map((r) => r.stats)
    .filter((s): s is CourseStats => s !== null);

  const unmeasured = verdict.reports.filter((r) => r.stats === null);
  if (unmeasured.length > 0) {
    heading("Not measured");
    for (const report of unmeasured) {
      console.log(`  ${report.file}: too badly shaped to measure. Fix the schema failures first.`);
    }
  }

  if (measured.length > 0) {
    printSummary(measured);
    printKeyDistribution(measured);
    printLessonWords(measured);
    printWideSpread(loaded);
    printStatisticHits(measured);
  }

  printFindings("Warnings", verdict.warnings);
  printFindings("Failures", verdict.problems);

  console.log("");
  if (verdict.ok) {
    console.log(
      `PASS. ${verdict.overall.questions} questions across ${verdict.overall.courses} course file${
        verdict.overall.courses === 1 ? "" : "s"
      }, ${verdict.warnings.length} warning${verdict.warnings.length === 1 ? "" : "s"} to read.`,
    );
    return;
  }

  console.log(
    `FAIL. ${verdict.problems.length} hard failure${
      verdict.problems.length === 1 ? "" : "s"
    }. Nothing was written anywhere; fix the files.`,
  );
  process.exit(1);
}

main();
