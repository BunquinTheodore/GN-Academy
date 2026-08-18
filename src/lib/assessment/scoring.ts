import {
  COMPETENCIES,
  LEVELS,
  type CompetencyKey,
  type LevelKey,
} from "@/content/ai-test";

export type ScorableQuestion = {
  id: string;
  competency: string;
  correct_option_id: string;
  points: number;
};

export type Answer = { questionId: string; optionId: string };

export type CompetencyResult = {
  key: CompetencyKey;
  label: string;
  weight: number;
  correct: number;
  total: number;
  score: number; // 0–100
};

export type ScoreResult = {
  overall: number; // 0–100, weighted
  competencies: CompetencyResult[];
  weakest: CompetencyResult;
  level: LevelKey;
  levelLabel: string;
  recommendedPath: string;
};

export function levelForScore(score: number): LevelKey {
  const clamped = Math.min(100, Math.max(0, score));
  for (const [key, def] of Object.entries(LEVELS)) {
    if (clamped >= def.range[0] && clamped <= def.range[1]) {
      return key as LevelKey;
    }
  }
  return "beginner";
}

/**
 * §8 scoring: each question is 0 or 1; competency score = correct/total ×
 * 100; overall = weight-averaged sum, rounded. Pure and deterministic —
 * the server is the only place it runs against real answers.
 */
export function scoreAttempt(
  questions: ScorableQuestion[],
  answers: Answer[],
): ScoreResult {
  const answerByQuestion = new Map(
    answers.map((a) => [a.questionId, a.optionId]),
  );

  const perCompetency = new Map<
    CompetencyKey,
    { correct: number; total: number }
  >();
  for (const key of Object.keys(COMPETENCIES) as CompetencyKey[]) {
    perCompetency.set(key, { correct: 0, total: 0 });
  }

  for (const q of questions) {
    const bucket = perCompetency.get(q.competency as CompetencyKey);
    if (!bucket) continue; // unknown competency rows don't crash scoring
    bucket.total += 1;
    if (answerByQuestion.get(q.id) === q.correct_option_id) {
      bucket.correct += 1;
    }
  }

  const competencies: CompetencyResult[] = (
    Object.entries(COMPETENCIES) as [
      CompetencyKey,
      (typeof COMPETENCIES)[CompetencyKey],
    ][]
  ).map(([key, def]) => {
    const { correct, total } = perCompetency.get(key)!;
    return {
      key,
      label: def.label,
      weight: def.weight,
      correct,
      total,
      score: total === 0 ? 0 : Math.round((correct / total) * 100),
    };
  });

  const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);
  const overall = Math.round(
    competencies.reduce((sum, c) => sum + c.score * c.weight, 0) /
      (totalWeight || 1),
  );

  const weakest = competencies.reduce((min, c) =>
    c.score < min.score ? c : min,
  );

  const level = levelForScore(overall);

  return {
    overall,
    competencies,
    weakest,
    level,
    levelLabel: LEVELS[level].label,
    recommendedPath: LEVELS[level].recommendedPath,
  };
}
