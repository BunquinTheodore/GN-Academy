/**
 * The competency registry: every skill any assessment on the platform can
 * score against, across every subject we teach.
 *
 * This is content, not engine. Labels are what a stranger reads on a
 * credential's breakdown, so they have to make sense with no course context.
 *
 * On weights: a weight only ever competes with the other competencies the
 * same assessment asked about. scoreAttempt normalises over what was asked
 * (see the long comment in src/lib/assessment/scoring.ts), so the AI four keep
 * the 25/20/35/20 split the AI Readiness Test was calibrated against, and a
 * new subject's competencies can all sit at 25 without meaning "equal to
 * prompting". Do not renumber the AI four: credentials already issued carry
 * scores computed under them.
 */

export type CompetencyDomain = "ai" | "blockchain" | "finance";

export const COMPETENCIES = {
  // AI Readiness Test and the AI courses. Weights are the §8 calibration.
  prompting: {
    label: "Prompting & output quality",
    weight: 25,
    measures: "Getting usable work out, not just conversation",
    domain: "ai",
  },
  tools: {
    label: "Tool fluency",
    weight: 20,
    measures: "Right tool for the job",
    domain: "ai",
  },
  workflow: {
    label: "Workflow integration",
    weight: 35,
    measures: "Building AI into how you actually work",
    domain: "ai",
  },
  judgment: {
    label: "Judgment & verification",
    weight: 20,
    measures: "Catching confident wrongness",
    domain: "ai",
  },

  // Basic Blockchain.
  chain_basics: {
    label: "How blockchains work",
    weight: 25,
    measures: "What the ledger actually does, past the hype",
    domain: "blockchain",
  },
  wallets_custody: {
    label: "Wallets & custody",
    weight: 25,
    measures: "Holding keys without losing them",
    domain: "blockchain",
  },
  risk_scams: {
    label: "Risk & scam awareness",
    weight: 25,
    measures: "Spotting the offer built to take your money",
    domain: "blockchain",
  },
  chain_applications: {
    label: "Real-world applications",
    weight: 25,
    measures: "Where a blockchain beats an ordinary database",
    domain: "blockchain",
  },

  // Basic Finance.
  budgeting: {
    label: "Budgeting & cash flow",
    weight: 25,
    measures: "Knowing where the money goes before it goes",
    domain: "finance",
  },
  saving_investing: {
    label: "Saving & investing",
    weight: 25,
    measures: "Putting money to work instead of leaving it idle",
    domain: "finance",
  },
  debt_credit: {
    label: "Debt & credit",
    weight: 25,
    measures: "Borrowing without getting buried",
    domain: "finance",
  },
  fraud_protection: {
    label: "Fraud protection",
    weight: 25,
    measures: "Catching the offer that is too good to be true",
    domain: "finance",
  },
} as const satisfies Record<
  string,
  { label: string; weight: number; measures: string; domain: CompetencyDomain }
>;

export type CompetencyKey = keyof typeof COMPETENCIES;

/** The domain a competency belongs to, or undefined for a key we don't know. */
export function domainOf(key: string): CompetencyDomain | undefined {
  return COMPETENCIES[key as CompetencyKey]?.domain;
}
