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

export type CompetencyDomain =
  | "ai"
  | "blockchain"
  | "finance"
  | "freelance"
  | "admin"
  | "content"
  | "security";

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

  // Freelancing, client communication, support and client operations.
  finding_work: {
    label: "Finding work",
    weight: 25,
    measures: "Getting in front of people who will pay you",
    domain: "freelance",
  },
  scoping_and_pricing: {
    label: "Scoping & pricing",
    weight: 25,
    measures: "Agreeing what the work is, and what it costs",
    domain: "freelance",
  },
  professional_communication: {
    label: "Professional communication",
    weight: 25,
    measures: "Writing to a client or an employer and being understood",
    domain: "freelance",
  },
  delivery_reliability: {
    label: "Delivery & reliability",
    weight: 25,
    measures: "Finishing, on time, to what was agreed",
    domain: "freelance",
  },

  // Bookkeeping and spreadsheets.
  record_keeping: {
    label: "Record keeping",
    weight: 25,
    measures: "Records you can stand behind months later",
    domain: "admin",
  },
  compliance_ph: {
    label: "Philippine compliance",
    weight: 25,
    measures: "Knowing the obligation, and where to check the current rule",
    domain: "admin",
  },
  working_with_numbers: {
    label: "Working with numbers",
    weight: 25,
    measures: "Rates, totals and arithmetic you can defend",
    domain: "admin",
  },
  admin_tooling: {
    label: "Admin tooling",
    weight: 25,
    measures: "Making a spreadsheet do the work instead of you",
    domain: "admin",
  },

  // Design, online selling and video.
  visual_craft: {
    label: "Visual craft",
    weight: 25,
    measures: "How it looks, and being able to say why",
    domain: "content",
  },
  message_craft: {
    label: "Message craft",
    weight: 25,
    measures: "What it says, and who it is for",
    domain: "content",
  },
  platform_fluency: {
    label: "Platform fluency",
    weight: 25,
    measures: "How the places you publish actually behave",
    domain: "content",
  },
  production_workflow: {
    label: "Production workflow",
    weight: 25,
    measures: "Making it repeatably, at volume, without burning out",
    domain: "content",
  },

  // Online safety.
  threat_recognition: {
    label: "Threat recognition",
    weight: 25,
    measures: "Spotting it before you click, send or pay",
    domain: "security",
  },
  account_hardening: {
    label: "Account hardening",
    weight: 25,
    measures: "Making an account expensive to take",
    domain: "security",
  },
  data_handling: {
    label: "Data handling",
    weight: 25,
    measures: "What you hand over, and to whom",
    domain: "security",
  },
  incident_response: {
    label: "Incident response",
    weight: 25,
    measures: "The first hour after it has already gone wrong",
    domain: "security",
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
