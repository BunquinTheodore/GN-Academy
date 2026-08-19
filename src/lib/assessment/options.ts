/**
 * Answer-option slots offered by the question editor. a–f is enough choice
 * for a scenario question and few enough to stay readable on a phone.
 * Lives outside the server-action file because "use server" modules may only
 * export async functions.
 */
export const OPTION_IDS = ["a", "b", "c", "d", "e", "f"] as const;

export type OptionId = (typeof OPTION_IDS)[number];
