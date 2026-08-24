import { describe, expect, it } from "vitest";
import {
  MAX_CORRECT_IS_LONGEST,
  MAX_SINGLE_LETTER_SHARE,
  MAX_WIDE_SPREAD_SHARE,
  OPTION_SPREAD_RATIO,
  checkAcrossFiles,
  checkAll,
  checkAssessment,
  checkCourse,
  checkNoEmDashes,
  checkSchema,
  correctIsLongest,
  loadCourseFiles,
  optionSpread,
  scanForStatistics,
  seedCourseSlugs,
  seedCredentialPrefixes,
  type LoadedCourse,
  type Question,
} from "@/lib/courses/content-checks";

/**
 * The authoring rules from README §21, enforced by `npm run verify` rather
 * than by somebody's eye.
 *
 * The rules themselves live in src/lib/courses/content-checks.ts and are
 * shared with scripts/validate-courses.ts, which is the same checks with a
 * report around them. Two copies of a rule is how a script and a test come to
 * disagree, and a gate that disagrees with itself gets ignored.
 *
 * This file does two jobs. The first block runs the real course files, which
 * is the check that matters. The blocks after it run deliberately broken
 * fixtures, because a gate nobody has ever seen fail is not a gate: if the
 * four authored files are clean, every rule here would pass whether or not it
 * was implemented.
 */

const real = loadCourseFiles();
const seedPrefixes = seedCredentialPrefixes();
const seedSlugs = seedCourseSlugs();

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

/** Four options of near-identical length, which is what the rule asks for. */
function question(overrides: Partial<Question> = {}, seed = 0): Question {
  const filler = "an option written at roughly the length of its neighbours";
  return {
    prompt: `What is the right next move in situation ${seed}?`,
    options: [
      { id: "a", text: `First ${filler}` },
      { id: "b", text: `Second ${filler}` },
      { id: "c", text: `Third ${filler}` },
      { id: "d", text: `Fourth ${filler}` },
    ],
    correct_option_id: "a",
    competency: "prompting",
    explanation: "Because the other three each fail for a different reason.",
    ...overrides,
  };
}

/** Eight questions with the key evenly spread, matching the shipped courses. */
function quiz(chapter: number): Question[] {
  const keys = ["a", "b", "c", "d", "a", "b", "c", "d"];
  return keys.map((correct, i) =>
    question({ correct_option_id: correct }, chapter * 100 + i),
  );
}

function course(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: "fixture-course",
    title: "Fixture Course",
    subtitle: "A course that exists only in this test",
    level: "foundation",
    category: "Foundations",
    format: "Self-paced online",
    summary: "A summary.",
    description: "A description.",
    skills: ["One"],
    outcomes: ["Two"],
    roles: ["Three"],
    price_php: null,
    is_free: true,
    passing_score: 70,
    credential_prefix: "FIX",
    sort_order: 99,
    modules: [1, 2].map((n) => ({
      slug: `chapter-${n}`,
      title: `Chapter ${n}`,
      description: `What chapter ${n} covers.`,
      lessons: [
        {
          slug: `lesson-${n}-1`,
          title: `Lesson ${n}.1`,
          content_mdx: "Plain prose with nothing to flag in it.",
          duration_minutes: 10,
        },
      ],
      quiz: quiz(n),
    })),
    assignment: {
      title: "The assignment",
      brief_mdx: "Do the thing and write it up.",
      criteria: ["It is done"],
      min_words: 400,
    },
    ...overrides,
  };
}

function loaded(overrides: Record<string, unknown> = {}): LoadedCourse {
  const parsed = course(overrides);
  return { file: "fixture-course.json", raw: JSON.stringify(parsed, null, 2), course: parsed };
}

/** Every hard failure raised for a fixture, as one blob to assert against. */
function failures(l: LoadedCourse): string {
  return checkCourse(l)
    .problems.map((p) => `${p.where}: ${p.message}`)
    .join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// The real course files
// ────────────────────────────────────────────────────────────────────────────

describe("the authored course files", () => {
  it("finds course files to check", () => {
    expect(real.length).toBeGreaterThanOrEqual(4);
  });

  it("passes every hard check", () => {
    const verdict = checkAll(real, seedPrefixes, seedSlugs);
    // Printed rather than counted, so a failure names the file, the chapter
    // and the question instead of saying "expected 0, got 3".
    expect(verdict.problems.map((p) => `${p.file} ${p.where}: ${p.message}`)).toEqual([]);
  });

  it("keeps correct-is-longest well below what guessing gives", () => {
    const verdict = checkAll(real, seedPrefixes, seedSlugs);
    const rate = verdict.overall.correctIsLongest / verdict.overall.questions;
    // README §21 quotes about 11% for what shipped. This asserts the measured
    // number has not quietly climbed toward the 25% a guesser scores, which is
    // the failure mode nobody notices while adding one course at a time.
    expect(rate).toBeLessThan(MAX_CORRECT_IS_LONGEST);
    expect(rate).toBeLessThan(0.15);
  });

  it("spreads the answer key across a, b, c and d in every course", () => {
    for (const report of checkAll(real, seedPrefixes, seedSlugs).reports) {
      const stats = report.stats;
      expect(stats, `${report.file} was too badly shaped to measure`).not.toBeNull();
      if (!stats) continue;
      for (const id of ["a", "b", "c", "d"] as const) {
        expect(
          stats.key[id] / stats.questions,
          `${report.file}: "${id}" holds too much of the key`,
        ).toBeLessThanOrEqual(MAX_SINGLE_LETTER_SHARE);
        // Every letter has to be used at all. A course that never answers "d"
        // is a pattern a learner spots inside one chapter.
        expect(stats.key[id], `${report.file}: "${id}" is never the answer`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps option lengths even", () => {
    for (const report of checkAll(real, seedPrefixes, seedSlugs).reports) {
      const stats = report.stats;
      if (!stats) continue;
      expect(
        stats.wideSpread / stats.questions,
        `${report.file}: too many questions where length answers the question`,
      ).toBeLessThanOrEqual(MAX_WIDE_SPREAD_SHARE);
    }
  });

  it("has lessons in every chapter with real text in them", () => {
    for (const report of checkAll(real, seedPrefixes, seedSlugs).reports) {
      const stats = report.stats;
      if (!stats) continue;
      expect(stats.lessons.length, `${report.file} has no lessons`).toBeGreaterThan(0);
      for (const lesson of stats.lessons) {
        expect(lesson.words, `${report.file} ${lesson.where} is nearly empty`).toBeGreaterThan(200);
      }
    }
  });

  it("does not collide with the credential prefixes seed.sql already owns", () => {
    expect(seedPrefixes).toContain("CAVA");
    expect(seedPrefixes).toContain("AIF");
    expect(checkAcrossFiles(real, seedPrefixes, seedSlugs)).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The rules, proved against deliberately broken fixtures
// ────────────────────────────────────────────────────────────────────────────

describe("schema", () => {
  it("accepts a well formed assignment course", () => {
    expect(checkSchema(loaded())).toEqual([]);
  });

  it("accepts a well formed exam course", () => {
    const exam = loaded({
      requires_assignment: false,
      assignment: undefined,
      final_exam: { title: "Final exam", questions: quiz(9) },
    });
    delete exam.course.assignment;
    expect(checkSchema(exam)).toEqual([]);
  });

  it("catches a field seed-courses.ts reads going missing", () => {
    const l = loaded();
    delete l.course.credential_prefix;
    expect(failures(l)).toContain('missing "credential_prefix"');
  });

  it("catches a field of the wrong type", () => {
    expect(failures(loaded({ passing_score: "70" }))).toContain('"passing_score" should be number');
  });

  it("catches a level the database would reject", () => {
    expect(failures(loaded({ level: "intermediate" }))).toContain('"level" is "intermediate"');
  });

  it("catches an assignment course with no assignment", () => {
    const l = loaded();
    delete l.course.assignment;
    expect(failures(l)).toContain('there is no "assignment" block');
  });

  it("catches an exam course with no final exam", () => {
    expect(failures(loaded({ requires_assignment: false }))).toContain(
      'there is no "final_exam" block',
    );
  });

  it("catches a final exam on a course that still requires an assignment", () => {
    const l = loaded({ final_exam: { title: "Final exam", questions: quiz(9) } });
    delete l.course.assignment;
    expect(failures(l)).toContain("requires_assignment is still true");
  });

  it("catches a course carrying both an assignment and a final exam", () => {
    // Seeds cleanly, and one of the two endings quietly issues nothing.
    expect(
      failures(loaded({ final_exam: { title: "Final exam", questions: quiz(9) } })),
    ).toContain("an ending that ends nothing");
  });

  it("catches a final exam with no questions", () => {
    expect(
      failures(
        loaded({
          requires_assignment: false,
          final_exam: { title: "Final exam", questions: [] },
        }),
      ),
    ).toContain("has no questions");
  });

  it("catches two chapters sharing a slug", () => {
    const l = loaded();
    const modules = l.course.modules as Record<string, unknown>[];
    modules[1].slug = modules[0].slug;
    expect(failures(l)).toContain("Chapters are matched on slug");
  });

  it("catches two lessons in one chapter sharing a slug", () => {
    const l = loaded();
    const modules = l.course.modules as Record<string, unknown>[];
    const lessons = modules[0].lessons as Record<string, unknown>[];
    lessons.push({ ...lessons[0], title: "A different title" });
    expect(failures(l)).toContain("lessons is unique on (module_id, slug)");
  });

  it("catches a chapter with an empty quiz", () => {
    const l = loaded();
    (l.course.modules as Record<string, unknown>[])[0].quiz = [];
    expect(failures(l)).toContain("a gate nobody can get through");
  });
});

describe("questions too malformed to check", () => {
  /**
   * The hole a code review found: `assessmentsOf` filters unshaped questions
   * out before any rule sees them, and `structurallySound` then refuses to
   * measure the file, so one broken question produced a report with no
   * failures, no statistics, and an exit code of 0. An author could write
   * `"correct_option_id": null`, run the gate the README sends them to, watch
   * it go green, and seed a quiz that scores zero for everyone who sits it.
   */
  function withBrokenQuestion(broken: Record<string, unknown>): LoadedCourse {
    const parsed = course();
    const modules = parsed.modules as Record<string, unknown>[];
    const firstQuiz = modules[0].quiz as Question[];
    firstQuiz[2] = broken as unknown as Question;
    return {
      file: "fixture-course.json",
      raw: JSON.stringify(parsed, null, 2),
      course: parsed,
    };
  }

  it("fails, and names the question, when correct_option_id is not a string", () => {
    const l = withBrokenQuestion({ ...question({}, 1), correct_option_id: null });
    expect(failures(l)).toContain("chapter 1 quiz, question 3");
    expect(checkCourse(l).problems.length).toBeGreaterThan(0);
  });

  it("fails when a question has no options at all", () => {
    const l = withBrokenQuestion({ ...question({}, 1), options: [] });
    expect(failures(l)).toContain("chapter 1 quiz, question 3");
  });

  it("fails when an option is missing its text", () => {
    const l = withBrokenQuestion({
      ...question({}, 1),
      options: [{ id: "a", text: "One" }, { id: "b" }, { id: "c", text: "Three" }, { id: "d", text: "Four" }],
    });
    expect(failures(l)).toContain("chapter 1 quiz, question 3");
  });

  it("never reports a clean bill of health on a file it could not measure", () => {
    const l = withBrokenQuestion({ ...question({}, 1), prompt: 42 });
    const report = checkCourse(l);
    // This is the whole point. Unmeasurable and problem-free at the same time
    // is the state that let a broken course through.
    expect(report.stats).toBeNull();
    expect(report.problems.length).toBeGreaterThan(0);
  });

  it("leaves a well-formed course alone", () => {
    const report = checkCourse(loaded());
    expect(report.stats).not.toBeNull();
    expect(failures(loaded())).not.toContain("is not a usable question");
  });
});

describe("questions", () => {
  const asAssessment = (questions: Question[]) => ({
    label: "chapter 1 quiz",
    slug: "fixture-course-chapter-1",
    questions,
  });
  const check = (questions: Question[]) =>
    checkAssessment("fixture-course.json", asAssessment(questions))
      .map((p) => p.message)
      .join("\n");

  it("passes a well formed quiz", () => {
    expect(check(quiz(1))).toBe("");
  });

  it("catches options that are not exactly a, b, c, d", () => {
    const q = question();
    q.options = q.options.slice(0, 3);
    expect(check([q])).toContain("should be exactly a, b, c, d");
  });

  it("catches options in the wrong order", () => {
    const q = question();
    q.options = [q.options[1], q.options[0], q.options[2], q.options[3]];
    expect(check([q])).toContain("should be exactly a, b, c, d");
  });

  it("catches a correct_option_id that is not on offer", () => {
    expect(check([question({ correct_option_id: "e" })])).toContain(
      "Every attempt at this question scores zero",
    );
  });

  it("catches a missing explanation", () => {
    expect(check([question({ explanation: "  " })])).toContain("has no explanation");
  });

  it("catches a competency that is not in the registry", () => {
    expect(check([question({ competency: "vibes" })])).toContain(
      'competency "vibes" is not in src/content/competencies.ts',
    );
  });

  it("catches an assessment drawing on two competency domains", () => {
    // A finance question scored against 'prompting' is the content bug this
    // exists for: the credential would carry a competency never taught.
    const mixed = [question({ competency: "prompting" }, 1), question({ competency: "budgeting" }, 2)];
    expect(check(mixed)).toContain("more than one competency domain");
  });

  it("allows one domain across a whole assessment", () => {
    const finance = [
      question({ competency: "budgeting" }, 1),
      question({ competency: "debt_credit" }, 2),
    ];
    expect(check(finance)).toBe("");
  });

  it("catches a duplicate prompt inside one assessment", () => {
    const twice = [question({}, 1), question({}, 1)];
    expect(check(twice)).toContain("is the same prompt as question 1");
  });

  it("allows the same prompt in two different assessments", () => {
    // Chapters are separate assessments and a deliberate callback is fine.
    expect(check([question({}, 1)])).toBe("");
    expect(check([question({}, 1)])).toBe("");
  });

  it("catches two options with the same text", () => {
    const q = question();
    q.options[2] = { id: "c", text: q.options[0].text };
    expect(check([q])).toContain("two options have the same text");
  });
});

describe("option length", () => {
  it("sees the correct answer being the longest option", () => {
    const q = question({ correct_option_id: "a" });
    q.options[0].text = `${q.options[0].text} and then a good deal more besides`;
    expect(correctIsLongest(q)).toBe(true);
  });

  it("does not count a tie for longest", () => {
    const q = question({ correct_option_id: "a" });
    q.options[0].text = "Exactly this long";
    q.options[1].text = "Exactly this long";
    q.options[2].text = "Short";
    q.options[3].text = "Short";
    expect(correctIsLongest(q)).toBe(false);
  });

  it("measures the spread between the longest and shortest option", () => {
    const even = question();
    expect(optionSpread(even)).toBeLessThan(OPTION_SPREAD_RATIO);

    const uneven = question();
    uneven.options[0].text = "Yes";
    expect(optionSpread(uneven)).toBeGreaterThan(OPTION_SPREAD_RATIO);
  });

  it("fails a course where the correct answer is usually the longest", () => {
    const l = loaded();
    for (const mod of l.course.modules as Record<string, unknown>[]) {
      for (const q of mod.quiz as Question[]) {
        const correct = q.options.find((o) => o.id === q.correct_option_id);
        if (correct) correct.text = `${correct.text} with a further clause tacked on the end of it`;
      }
    }
    expect(failures(l)).toContain("A learner who reads nothing and picks the longest option");
  });

  it("fails a course whose answer key sits on one letter", () => {
    const l = loaded();
    for (const mod of l.course.modules as Record<string, unknown>[]) {
      for (const q of mod.quiz as Question[]) q.correct_option_id = "b";
    }
    expect(failures(l)).toContain("Spread the key across a, b, c and d");
  });

  it("fails a course where option lengths are uneven throughout", () => {
    const l = loaded();
    for (const mod of l.course.modules as Record<string, unknown>[]) {
      for (const q of mod.quiz as Question[]) q.options[3].text = "No";
    }
    expect(failures(l)).toContain("Length is answering the question");
  });

  it("reports a single uneven question as a warning rather than a failure", () => {
    const l = loaded();
    const first = (l.course.modules as Record<string, unknown>[])[0];
    (first.quiz as Question[])[0].options[3].text = "No";
    const report = checkCourse(l);
    expect(report.problems).toEqual([]);
    expect(report.warnings.map((w) => w.message).join("\n")).toContain(
      "more than 1.8x the shortest",
    );
  });
});

describe("em dashes", () => {
  it("passes a clean file", () => {
    expect(checkNoEmDashes(loaded())).toEqual([]);
  });

  it("catches one anywhere in the file, with its line number", () => {
    // Built from the code point so this test file does not itself trip
    // tests/unit/no-em-dashes.test.ts, which scans src and scripts.
    const dash = String.fromCharCode(0x2014);
    const l = loaded();
    l.raw = `{\n  "title": "A course${dash}with a dash"\n}`;
    const found = checkNoEmDashes(l);
    expect(found).toHaveLength(1);
    expect(found[0].where).toBe("line 2");
    expect(found[0].message).toContain("an em dash");
  });
});

describe("slugs and credential prefixes across files", () => {
  const second = (overrides: Record<string, unknown>): LoadedCourse => {
    const parsed = course({ slug: "second-course", credential_prefix: "SEC", ...overrides });
    return { file: "second-course.json", raw: JSON.stringify(parsed), course: parsed };
  };

  it("passes two courses that share nothing", () => {
    expect(checkAcrossFiles([loaded(), second({})], seedPrefixes, seedSlugs)).toEqual([]);
  });

  it("catches a duplicate course slug", () => {
    const found = checkAcrossFiles([loaded(), second({ slug: "fixture-course" })], [], []);
    expect(found.map((f) => f.message).join("\n")).toContain('course slug "fixture-course"');
  });

  it("catches a duplicate credential prefix", () => {
    const found = checkAcrossFiles([loaded(), second({ credential_prefix: "FIX" })], [], []);
    expect(found.map((f) => f.message).join("\n")).toContain('credential_prefix "FIX"');
  });

  it("catches a prefix already taken by supabase/seed.sql", () => {
    const found = checkAcrossFiles([loaded({ credential_prefix: "CAVA" })], seedPrefixes, seedSlugs);
    expect(found.map((f) => f.message).join("\n")).toContain("supabase/seed.sql");
  });

  it("catches a final exam slug colliding with a chapter quiz", () => {
    // assessments is upserted on slug, so this quietly moves a chapter's
    // questions onto the assessment that issues the credential.
    const l = loaded({
      requires_assignment: false,
      final_exam: {
        title: "Final exam",
        slug: "fixture-course-chapter-1",
        questions: quiz(9),
      },
    });
    delete l.course.assignment;
    const found = checkAcrossFiles([l], [], []);
    expect(found.map((f) => f.message).join("\n")).toContain("these two would become one");
  });
});

describe("the invented-statistic scan", () => {
  const patterns = (text: string) =>
    scanForStatistics("chapter 1, lesson 1", text).map((h) => h.pattern);

  it("finds a bare percentage", () => {
    expect(patterns("Around 70% of the work is follow-up.")).toContain("percentage");
    expect(patterns("Around 70 percent of the work is follow-up.")).toContain("percentage");
  });

  it("finds X out of Y", () => {
    expect(patterns("It works three out of four times.")).toContain("X out of Y");
    expect(patterns("It works nine times out of ten.")).toContain("nine times out of ten");
  });

  it("finds the appeal to research", () => {
    expect(patterns("Studies show this is faster.")).toContain("studies show");
    expect(patterns("Research says otherwise.")).toContain("research says");
    expect(patterns("Half of all AI mistakes look like this.")).toContain("half of all");
  });

  it("finds a vague quantity", () => {
    expect(patterns("Most people never read the second line.")).toContain("most");
  });

  it("leaves the superlative alone, which is not a quantity claim", () => {
    expect(patterns("That is the most useful thing in the chapter.")).toEqual([]);
  });

  it("returns the sentence, since a human has to judge each hit", () => {
    const hits = scanForStatistics("chapter 4, lesson 1", "A CTR of about 1.9 percent is fine.");
    expect(hits[0].sentence).toBe("A CTR of about 1.9 percent is fine.");
    expect(hits[0].where).toBe("chapter 4, lesson 1");
  });

  it("never turns into a hard failure on its own", () => {
    const l = loaded();
    const first = (l.course.modules as Record<string, unknown>[])[0];
    (first.lessons as Record<string, unknown>[])[0].content_mdx =
      "Studies show that 90% of readers agree, nine times out of ten.";
    const report = checkCourse(l);
    expect(report.problems).toEqual([]);
    expect(report.stats?.statisticHits.length).toBeGreaterThan(0);
  });
});
