import { describe, expect, it } from "vitest";
import {
  levelForScore,
  scoreAttempt,
  type Answer,
  type ScorableQuestion,
} from "@/lib/assessment/scoring";

/** 15 questions matching the seed's shape: 4 prompting, 4 tools, 4 workflow, 3 judgment. */
function makeQuestions(): ScorableQuestion[] {
  const spec: [string, number][] = [
    ["prompting", 4],
    ["tools", 4],
    ["workflow", 4],
    ["judgment", 3],
  ];
  const questions: ScorableQuestion[] = [];
  for (const [competency, count] of spec) {
    for (let i = 0; i < count; i++) {
      questions.push({
        id: `${competency}-${i}`,
        competency,
        correct_option_id: "b",
        points: 1,
      });
    }
  }
  return questions;
}

function answersFor(
  questions: ScorableQuestion[],
  correctIds: Set<string>,
): Answer[] {
  return questions.map((q) => ({
    questionId: q.id,
    optionId: correctIds.has(q.id) ? q.correct_option_id : "x",
  }));
}

describe("scoreAttempt", () => {
  const questions = makeQuestions();

  it("scores a perfect run as 100 / Advanced", () => {
    const result = scoreAttempt(
      questions,
      answersFor(questions, new Set(questions.map((q) => q.id))),
    );
    expect(result.overall).toBe(100);
    expect(result.level).toBe("advanced");
  });

  it("scores an empty run as 0 / Beginner", () => {
    const result = scoreAttempt(questions, []);
    expect(result.overall).toBe(0);
    expect(result.level).toBe("beginner");
  });

  it("weights competencies 25/20/35/20", () => {
    // All workflow correct, everything else wrong → exactly the 35% weight.
    const workflowIds = new Set(
      questions.filter((q) => q.competency === "workflow").map((q) => q.id),
    );
    const result = scoreAttempt(questions, answersFor(questions, workflowIds));
    expect(result.overall).toBe(35);
  });

  it("lands the casual-user profile in Developing (§8 calibration)", () => {
    // 2/4 prompting, 2/4 tools, 1/4 workflow, 2/3 judgment — a typical
    // daily-ChatGPT-user pattern.
    const ids = new Set([
      "prompting-0",
      "prompting-1",
      "tools-0",
      "tools-1",
      "workflow-0",
      "judgment-0",
      "judgment-1",
    ]);
    const result = scoreAttempt(questions, answersFor(questions, ids));
    expect(result.level).toBe("developing");
    expect(result.overall).toBeGreaterThanOrEqual(40);
    expect(result.overall).toBeLessThanOrEqual(69);
  });

  it("names the weakest competency", () => {
    const allButWorkflow = new Set(
      questions.filter((q) => q.competency !== "workflow").map((q) => q.id),
    );
    const result = scoreAttempt(
      questions,
      answersFor(questions, allButWorkflow),
    );
    expect(result.weakest.key).toBe("workflow");
    expect(result.weakest.score).toBe(0);
  });

  it("ignores answers to unknown questions", () => {
    const result = scoreAttempt(questions, [
      { questionId: "not-a-question", optionId: "b" },
    ]);
    expect(result.overall).toBe(0);
  });
});

describe("levelForScore", () => {
  it("maps band edges per §8", () => {
    expect(levelForScore(0)).toBe("beginner");
    expect(levelForScore(39)).toBe("beginner");
    expect(levelForScore(40)).toBe("developing");
    expect(levelForScore(69)).toBe("developing");
    expect(levelForScore(70)).toBe("jobReady");
    expect(levelForScore(84)).toBe("jobReady");
    expect(levelForScore(85)).toBe("advanced");
    expect(levelForScore(100)).toBe("advanced");
  });
});

describe("assessments that cover only some competencies", () => {
  /**
   * Chapter quizzes cover whichever competencies their chapter teaches. The
   * weights in COMPETENCIES were written for the AI Readiness Test, where all
   * four always appear — weighting the absent ones as zero made a perfect
   * paper on a judgment-only quiz score 20%, which is below every pass mark
   * there is. That shipped, and made one course's credential unobtainable.
   */
  const judgmentOnly: ScorableQuestion[] = Array.from({ length: 8 }, (_, i) => ({
    id: `q${i}`,
    competency: "judgment",
    correct_option_id: "a",
    points: 1,
  }));

  it("scores a perfect single-competency quiz as 100, not as its weight", () => {
    const answers = judgmentOnly.map((q) => ({
      questionId: q.id,
      optionId: "a",
    }));
    expect(scoreAttempt(judgmentOnly, answers).overall).toBe(100);
  });

  it("scores half right as 50 on a single-competency quiz", () => {
    const answers = judgmentOnly.map((q, i) => ({
      questionId: q.id,
      optionId: i < 4 ? "a" : "b",
    }));
    expect(scoreAttempt(judgmentOnly, answers).overall).toBe(50);
  });

  it("never reports an unasked competency as the weakest area", () => {
    const answers = judgmentOnly.map((q) => ({
      questionId: q.id,
      optionId: "a",
    }));
    expect(scoreAttempt(judgmentOnly, answers).weakest.key).toBe("judgment");
  });

  it("weights two competencies against each other, not against all four", () => {
    // prompting 25 and workflow 35. All prompting right, all workflow wrong,
    // so the score is 25/(25+35) = 42, not 25/100.
    const mixed: ScorableQuestion[] = [
      { id: "p1", competency: "prompting", correct_option_id: "a", points: 1 },
      { id: "p2", competency: "prompting", correct_option_id: "a", points: 1 },
      { id: "w1", competency: "workflow", correct_option_id: "a", points: 1 },
      { id: "w2", competency: "workflow", correct_option_id: "a", points: 1 },
    ];
    const answers = [
      { questionId: "p1", optionId: "a" },
      { questionId: "p2", optionId: "a" },
      { questionId: "w1", optionId: "b" },
      { questionId: "w2", optionId: "b" },
    ];
    expect(scoreAttempt(mixed, answers).overall).toBe(42);
  });
});
