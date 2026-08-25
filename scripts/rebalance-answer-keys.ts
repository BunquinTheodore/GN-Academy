/**
 * Breaks deducible patterns in an answer key by reordering options.
 *
 *   npx tsx scripts/rebalance-answer-keys.ts            # dry run, reports only
 *   npx tsx scripts/rebalance-answer-keys.ts --write    # rewrite the files
 *   npx tsx scripts/rebalance-answer-keys.ts --write basic-ai
 *
 * WHAT IT CHANGES, AND WHAT IT DOES NOT.
 *
 * It changes the ORDER of the four options inside a question, and therefore
 * which letter is correct. It never changes which option TEXT is correct, never
 * edits a prompt, an explanation or a competency, and never adds or removes a
 * question. The learner's task is identical afterwards.
 *
 * It also preserves each assessment's letter distribution exactly: it permutes
 * the multiset of existing correct letters rather than choosing new ones, so a
 * quiz that answered two of each still answers two of each.
 *
 * WHY IT EXISTS. `content-checks.ts` measures the answer key for two patterns a
 * distribution cannot see: a monotone run of three or more consecutive answers
 * (3, 4, 5 answering "b, c, d"), and a key that reads the same backwards. Both
 * are solvable without reading the questions, which is the same defect as
 * making the correct answer the longest option, and the course catalogue's
 * whole value rests on the credential meaning something.
 *
 * The length tells are untouched by design: correct-is-longest and
 * correct-is-shortest depend on which text is correct, not on where it sits, so
 * reordering cannot make them better or worse.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COURSES_DIR = join(process.cwd(), "supabase", "courses");
const IDS = ["a", "b", "c", "d"] as const;

type Option = { id: string; text: string };
type Question = {
  prompt: string;
  options: Option[];
  correct_option_id: string;
  [k: string]: unknown;
};
type Assessment = { label: string; questions: Question[] };

/** A monotone run of `len` or more consecutive letters, ascending or descending. */
function hasRun(letters: string[], len = 3): boolean {
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < letters.length; i += 1) {
    const step = letters[i].charCodeAt(0) - letters[i - 1].charCodeAt(0);
    asc = step === 1 ? asc + 1 : 1;
    desc = step === -1 ? desc + 1 : 1;
    if (asc >= len || desc >= len) return true;
  }
  return false;
}

function isPalindrome(letters: string[]): boolean {
  if (letters.length < 4) return false;
  return letters.join("") === [...letters].reverse().join("");
}

function isClean(letters: string[]): boolean {
  return !hasRun(letters) && !isPalindrome(letters);
}

/**
 * A deterministic shuffle. Seeded so two runs over the same file produce the
 * same output: a script that rewrites 618 questions differently every time is
 * impossible to review in a diff.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A permutation of the same letters with no run and no mirror. */
function reorderKey(letters: string[], seed: number): string[] | null {
  if (isClean(letters)) return letters;
  const rand = mulberry32(seed);
  for (let attempt = 0; attempt < 4000; attempt += 1) {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (isClean(shuffled)) return shuffled;
  }
  return null;
}

/** Move the correct text onto `target`, keeping the others in their order. */
function placeCorrectAt(question: Question, target: string): void {
  const correct = question.options.find((o) => o.id === question.correct_option_id);
  if (!correct) throw new Error(`No correct option for: ${question.prompt.slice(0, 60)}`);
  const others = question.options.filter((o) => o.id !== question.correct_option_id);

  const rebuilt: Option[] = [];
  let next = 0;
  for (const id of IDS) {
    rebuilt.push({ id, text: id === target ? correct.text : others[next++].text });
  }
  question.options = rebuilt;
  question.correct_option_id = target;
}

function assessmentsOf(course: Record<string, unknown>): Assessment[] {
  const out: Assessment[] = [];
  const modules = Array.isArray(course.modules) ? course.modules : [];
  modules.forEach((m, i) => {
    const mod = m as { quiz?: Question[] };
    if (Array.isArray(mod.quiz)) {
      out.push({ label: `chapter ${i + 1} quiz`, questions: mod.quiz });
    }
  });
  const exam = course.final_exam as { questions?: Question[] } | undefined;
  if (exam && Array.isArray(exam.questions)) {
    out.push({ label: "final exam", questions: exam.questions });
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const only = args.find((a) => !a.startsWith("--"));

  const files = readdirSync(COURSES_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => (only ? f.startsWith(only) : true));

  let touched = 0;
  let questionsMoved = 0;
  let unfixable = 0;

  for (const file of files) {
    const path = join(COURSES_DIR, file);
    const raw = readFileSync(path, "utf8");
    const course = JSON.parse(raw) as Record<string, unknown>;
    const changes: string[] = [];

    for (const assessment of assessmentsOf(course)) {
      const before = assessment.questions.map((q) => q.correct_option_id);
      if (isClean(before)) continue;

      const after = reorderKey(before, seedFrom(file + assessment.label));
      if (!after) {
        changes.push(`  ${assessment.label}: could not find a clean key, left alone`);
        unfixable += 1;
        continue;
      }

      let moved = 0;
      assessment.questions.forEach((q, i) => {
        if (q.correct_option_id === after[i]) return;
        placeCorrectAt(q, after[i]);
        moved += 1;
      });
      questionsMoved += moved;
      changes.push(
        `  ${assessment.label}: ${before.join("")} -> ${after.join("")} (${moved} question${moved === 1 ? "" : "s"} reordered)`,
      );
    }

    if (changes.length === 0) continue;
    touched += 1;
    console.log(`\n${file}`);
    changes.forEach((c) => console.log(c));

    if (write) {
      // Trailing newline, to match how the files were authored.
      writeFileSync(path, `${JSON.stringify(course, null, 2)}\n`, "utf8");
    }
  }

  console.log(
    `\n${write ? "Rewrote" : "Would rewrite"} ${touched} file${touched === 1 ? "" : "s"}, reordering ${questionsMoved} questions.`,
  );
  if (unfixable > 0) {
    console.log(
      `${unfixable} assessment${unfixable === 1 ? "" : "s"} could not be cleaned automatically and need a human.`,
    );
  }
  if (!write) console.log("Dry run. Pass --write to apply.");
}

main();
