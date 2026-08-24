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
    expect(result.weakest?.key).toBe("workflow");
    expect(result.weakest?.score).toBe(0);
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
    expect(scoreAttempt(judgmentOnly, answers).weakest?.key).toBe(
      "judgment",
    );
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

describe("subjects beyond AI", () => {
  /**
   * The competency registry covers blockchain and finance too. A result must
   * carry only what its assessment asked about: a finance credential that
   * listed "Prompting & output quality" at 0 would be reporting a measurement
   * that never happened.
   */
  function quiz(competency: string, count: number): ScorableQuestion[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `${competency}-${i}`,
      competency,
      correct_option_id: "a",
      points: 1,
    }));
  }

  const blockchain = [
    ...quiz("chain_basics", 2),
    ...quiz("wallets_custody", 2),
    ...quiz("risk_scams", 2),
  ];

  it("returns only the competencies a blockchain quiz asked about", () => {
    const result = scoreAttempt(
      blockchain,
      blockchain.map((q) => ({ questionId: q.id, optionId: "a" })),
    );
    expect(result.competencies.map((c) => c.key).sort()).toEqual([
      "chain_basics",
      "risk_scams",
      "wallets_custody",
    ]);
    expect(result.overall).toBe(100);
  });

  it("scores a partly right blockchain quiz on what it asked", () => {
    // All of chain_basics and wallets_custody right, risk_scams wrong. The
    // three weigh 25 each, so the score is 2/3 of the paper, not 2/12 of the
    // registry.
    const answers = blockchain.map((q) => ({
      questionId: q.id,
      optionId: q.competency === "risk_scams" ? "z" : "a",
    }));
    const result = scoreAttempt(blockchain, answers);
    expect(result.overall).toBe(67);
    expect(result.weakest?.key).toBe("risk_scams");
  });

  it("scores a perfect single-competency paper as 100, not as its weight", () => {
    const budgeting = quiz("budgeting", 6);
    const result = scoreAttempt(
      budgeting,
      budgeting.map((q) => ({ questionId: q.id, optionId: "a" })),
    );
    expect(result.overall).toBe(100);
    expect(result.competencies).toHaveLength(1);
    expect(result.competencies[0].weight).toBe(25);
  });

  it("drops a competency no question asked about, rather than reporting it as 0", () => {
    const financeOnly = [...quiz("budgeting", 2), ...quiz("debt_credit", 2)];
    const keys = scoreAttempt(financeOnly, []).competencies.map((c) => c.key);
    expect(keys).toEqual(["budgeting", "debt_credit"]);
    expect(keys).not.toContain("prompting");
  });

  it("has no weakest area when the paper asked nothing scorable", () => {
    const unknownOnly: ScorableQuestion[] = [
      { id: "u1", competency: "astrology", correct_option_id: "a", points: 1 },
    ];
    const result = scoreAttempt(unknownOnly, [
      { questionId: "u1", optionId: "a" },
    ]);
    expect(result.competencies).toEqual([]);
    expect(result.weakest).toBeNull();
    expect(result.overall).toBe(0);
  });
});

describe("the AI Readiness Test is unchanged by the wider registry", () => {
  const questions = makeQuestions();

  it("returns exactly the four AI rows, in order, with the same numbers", () => {
    // 3/4 prompting, 2/4 tools, 4/4 workflow, 1/3 judgment.
    const ids = new Set([
      "prompting-0",
      "prompting-1",
      "prompting-2",
      "tools-0",
      "tools-1",
      "workflow-0",
      "workflow-1",
      "workflow-2",
      "workflow-3",
      "judgment-0",
    ]);
    const result = scoreAttempt(questions, answersFor(questions, ids));
    expect(result.competencies).toEqual([
      {
        key: "prompting",
        label: "Prompting & output quality",
        weight: 25,
        correct: 3,
        total: 4,
        score: 75,
      },
      {
        key: "tools",
        label: "Tool fluency",
        weight: 20,
        correct: 2,
        total: 4,
        score: 50,
      },
      {
        key: "workflow",
        label: "Workflow integration",
        weight: 35,
        correct: 4,
        total: 4,
        score: 100,
      },
      {
        key: "judgment",
        label: "Judgment & verification",
        weight: 20,
        correct: 1,
        total: 3,
        score: 33,
      },
    ]);
    // 75×25 + 50×20 + 100×35 + 33×20 over 100.
    expect(result.overall).toBe(70);
    expect(result.level).toBe("jobReady");
    expect(result.weakest?.key).toBe("judgment");
  });
});
