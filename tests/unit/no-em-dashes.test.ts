import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No em dash may reach a reader.
 *
 * The client's objection is that it reads as machine-written, and they are
 * right that it is a tell. Removing 250 of them by hand is only worth doing
 * once, so this stops the next one at the test rather than in production.
 *
 * Developer comments are deliberately exempt. The request was about text the
 * user reads, and several comments in this codebase use dashes while
 * explaining decisions that cost real time to work out.
 */

const ROOT = process.cwd();
const EM_DASH = "—";
const EN_DASH = "–";

function sourceFiles(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, match, out);
    else if (match.test(entry.name)) out.push(full);
  }
  return out;
}

function isComment(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("*") ||
    t.startsWith("//") ||
    t.startsWith("/*") ||
    // JSX comments, which is how component files annotate markup.
    t.startsWith("{/*") ||
    t.startsWith("--")
  );
}

/**
 * Drops a trailing line comment so a dash inside one does not count.
 *
 * Naive, and deliberately so: it does not try to tell a real `//` from one
 * inside a string, because the only cost of getting that wrong is missing a
 * dash in a line that also contains "//", and no copy in this codebase does.
 */
function withoutTrailingComment(line: string): string {
  const slashes = line.indexOf("//");
  const dashes = line.indexOf("--");
  const cut = [slashes, dashes].filter((i) => i > -1).sort((a, b) => a - b)[0];
  return cut === undefined ? line : line.slice(0, cut);
}

/** Returns "path:line  text" for each offending line. */
function offenders(files: string[], skipComments: boolean): string[] {
  const found: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (skipComments && isComment(line)) return;
      const text = skipComments ? withoutTrailingComment(line) : line;
      if (!text.includes(EM_DASH) && !text.includes(EN_DASH)) return;
      found.push(
        `${file.replace(ROOT, "").replace(/\\/g, "/")}:${i + 1}  ${line.trim().slice(0, 100)}`,
      );
    });
  }
  return found;
}

describe("user-facing copy contains no em dashes", () => {
  it("has none in the application source", () => {
    const files = sourceFiles(join(ROOT, "src"), /\.tsx?$/);
    expect(files.length).toBeGreaterThan(50);
    expect(offenders(files, true)).toEqual([]);
  });

  it("has none in the seeded course and blog content", () => {
    expect(offenders([join(ROOT, "supabase", "seed.sql")], true)).toEqual([]);
  });

  /**
   * The scripts write content too. `scripts/seed-courses.ts` built a chapter
   * quiz title with an em dash in it and shipped that straight into
   * `assessments.title`, which learners read on their courses page, while this
   * test stayed green because it only looked at `src`.
   */
  it("has none in the strings the seeding scripts write", () => {
    const files = sourceFiles(join(ROOT, "scripts"), /\.ts$/).filter(
      // The one script that has to contain an em dash: its whole job is
      // counting them in the database, so the character is in its SQL.
      (f) => !f.endsWith("refresh-seed-content.ts"),
    );
    expect(files.length).toBeGreaterThan(0);
    expect(offenders(files, true)).toEqual([]);
  });

  it("has none in the authored course files", () => {
    const dir = join(ROOT, "supabase", "courses");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(dir, f));
    expect(files.length).toBeGreaterThan(0);
    // JSON has no comments, so every line here is content someone reads.
    expect(offenders(files, false)).toEqual([]);
  });
});
