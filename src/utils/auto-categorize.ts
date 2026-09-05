import { Expense } from "@/types/types";
import { getExpenseKind } from "./expense-utils";

export type AutoCategorizeMode = "tags" | "groups";

export type CategorizeSuggestion = {
  expense: Expense;
  matchCount: number;
  suggested: string;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "for", "with", "at", "from",
  "by", "on", "in", "of", "off", "up", "via",
]);

export const normalizeDescription = (description: string): string =>
  description
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const tokenize = (description: string): string[] =>
  normalizeDescription(description)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

const tokenSimilarity = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const t of a) {
    if (setB.has(t)) shared++;
  }
  return shared / Math.max(a.length, b.length);
};

export const computeSuggestions = (
  expenses: Expense[],
  mode: AutoCategorizeMode
): CategorizeSuggestion[] => {
  type Learned = { tokens: string[]; target: string };
  const learned: Learned[] = [];

  for (const e of expenses) {
    if (getExpenseKind(e) !== "expense") continue;
    const target =
      mode === "tags"
        ? e.tags.length > 0
          ? e.tags[0]
          : null
        : e.group ?? null;
    if (!target) continue;
    const tokens = tokenize(e.description);
    if (tokens.length === 0) continue;
    learned.push({ tokens, target });
  }

  const suggestions: CategorizeSuggestion[] = [];

  for (const e of expenses) {
    if (getExpenseKind(e) !== "expense") continue;
    if (mode === "tags") {
      if (e.tags.length > 0) continue;
    } else if (e.group) {
      continue;
    }

    const tokens = tokenize(e.description);
    if (tokens.length === 0) continue;

    const counts = new Map<string, number>();
    let bestScore = 0;

    for (const l of learned) {
      const score = tokenSimilarity(l.tokens, tokens);
      if (score < 0.5) continue;
      if (score > bestScore) bestScore = score;
      counts.set(l.target, (counts.get(l.target) ?? 0) + 1);
    }

    if (counts.size === 0) continue;

    let bestTarget: string | null = null;
    let bestCount = 0;
    for (const [target, count] of counts.entries()) {
      if (count > bestCount) {
        bestTarget = target;
        bestCount = count;
      }
    }

    if (bestTarget) {
      suggestions.push({
        expense: e,
        matchCount: bestCount,
        suggested: bestTarget,
      });
    }
  }

  return suggestions;
};
