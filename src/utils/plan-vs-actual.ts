import { BudgetLine, Expense } from "@/types/types";
import { forecastOccurrences, type CashFlowConfig } from "@/utils/cash-flow-forecast";
import { tagLabel } from "@/utils/expense-utils";

export const UNGROUPED = "Ungrouped";

export type PlanRow = {
  key: string;
  category: string;
  budget: number;
  forecast: number;
  actual: number;
  hasBudget: boolean;
  hasForecast: boolean;
};

export type PlanTotals = {
  budget: number;
  forecast: number;
  actual: number;
};

export type PlanVsActual = {
  tagRows: PlanRow[];
  groupRows: PlanRow[];
  income: { forecast: number; actual: number };
  totals: PlanTotals;
};

export type PlanInput = {
  expenses: Expense[];
  income: Expense[];
  budgets: BudgetLine[];
  forecast: CashFlowConfig | null;
  months: string[];
};

const sumByKey = (
  items: Expense[],
  months: Set<string>,
  keyFor: (e: Expense) => string | undefined
): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const e of items) {
    if (!months.has(e.date.slice(0, 7))) continue;
    const key = keyFor(e);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }
  return totals;
};

export function computePlanVsActual({
  expenses,
  income,
  budgets,
  forecast,
  months,
}: PlanInput): PlanVsActual {
  const monthSet = new Set(months);
  const monthCount = months.length;

  const tagActuals = sumByKey(expenses, monthSet, tagLabel);
  const groupActuals = sumByKey(expenses, monthSet, (e) => e.group || UNGROUPED);

  const tagBudgets = budgets.filter((b) => b.kind === "tag");
  const groupBudgets = budgets.filter((b) => b.kind === "group");

  const canonicalizer = (names: string[]) => {
    const known = new Map<string, string>();
    for (const name of names) known.set(name.toLowerCase(), name);
    return (name: string) => known.get(name.toLowerCase()) ?? name;
  };
  const canonicalTag = canonicalizer([...tagActuals.keys(), ...tagBudgets.map((b) => b.name)]);
  const canonicalGroup = canonicalizer([...groupActuals.keys(), ...groupBudgets.map((b) => b.name)]);

  const tagForecasts = new Map<string, number>();
  const groupForecasts = new Map<string, number>();
  let incomeForecast = 0;
  if (forecast) {
    const occurrences = forecastOccurrences(forecast);
    const add = (map: Map<string, number>, key: string, amount: number) =>
      map.set(key, (map.get(key) ?? 0) + amount);
    for (const o of occurrences.expenses) {
      if (!monthSet.has(o.date.slice(0, 7))) continue;
      const label = (forecast.expenses[o.ruleIndex]?.name ?? "").trim();
      if (!label) continue;
      add(tagForecasts, canonicalTag(label), o.amount);
      add(groupForecasts, canonicalGroup(label), o.amount);
    }
    for (const o of occurrences.income) {
      if (monthSet.has(o.date.slice(0, 7))) incomeForecast += o.amount;
    }
  }

  const budgetFor = (lines: BudgetLine[], name: string) =>
    lines
      .filter((b) => b.name.toLowerCase() === name.toLowerCase())
      .reduce((sum, b) => sum + b.monthly * monthCount, 0);

  const byLargest = (a: PlanRow, b: PlanRow) =>
    Math.max(b.budget, b.forecast, b.actual) - Math.max(a.budget, a.forecast, a.actual);

  const buildRows = (
    kind: "tag" | "group",
    actuals: Map<string, number>,
    forecasts: Map<string, number>,
    lines: BudgetLine[],
    canonicalName: (name: string) => string
  ): PlanRow[] => {
    const names = new Set<string>([
      ...actuals.keys(),
      ...forecasts.keys(),
      ...lines.map((b) => canonicalName(b.name)),
    ]);
    return [...names]
      .map((category) => ({
        key: `${kind}:${category}`,
        category,
        budget: budgetFor(lines, category),
        forecast: forecasts.get(category) ?? 0,
        actual: actuals.get(category) ?? 0,
        hasBudget: lines.some((b) => b.name.toLowerCase() === category.toLowerCase()),
        hasForecast: forecasts.has(category),
      }))
      .sort(byLargest);
  };

  const tagRows = buildRows("tag", tagActuals, tagForecasts, tagBudgets, canonicalTag);
  const groupRows = buildRows("group", groupActuals, groupForecasts, groupBudgets, canonicalGroup);

  const incomeActual = income
    .filter((e) => monthSet.has(e.date.slice(0, 7)))
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  const totals: PlanTotals = {
    budget: groupRows.reduce((s, r) => s + r.budget, 0),
    forecast: groupRows.reduce((s, r) => s + r.forecast, 0),
    actual: groupRows.reduce((s, r) => s + r.actual, 0),
  };

  return {
    tagRows,
    groupRows,
    income: { forecast: incomeForecast, actual: incomeActual },
    totals,
  };
}

export type Variance = { amount: number; over: boolean };

export const variance = (actual: number, plan: number): Variance => ({
  amount: actual - plan,
  over: actual > plan,
});
