import { Expense } from "@/types/types";
import { getExpenseKind, tagLabel } from "@/utils/expense-utils";

export type Anomaly = {
  category: string;
  month: string;
  amount: number;
  typical: number;
  multiplier: number;
  excess: number;
};

export type AnomalyOptions = {
  multiplier?: number;
  minOver?: number;
  minSamples?: number;
  windowMonths?: number;
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

export function detectAnomalies(
  expenses: Expense[],
  options: AnomalyOptions = {}
): Anomaly[] {
  const {
    multiplier = 1.5,
    minOver = 150,
    minSamples = 3,
    windowMonths = 12,
  } = options;

  const byCategory = new Map<string, Map<string, number>>();
  for (const e of expenses) {
    if (getExpenseKind(e) !== "expense") continue;
    const cat = tagLabel(e);
    const month = e.date.slice(0, 7);
    const months = byCategory.get(cat) ?? new Map<string, number>();
    months.set(month, (months.get(month) ?? 0) + e.amount);
    byCategory.set(cat, months);
  }

  const anomalies: Anomaly[] = [];
  for (const [category, months] of byCategory) {
    const monthlyTotals = [...months.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (let i = 0; i < monthlyTotals.length; i++) {
      const [month, amount] = monthlyTotals[i];
      const others = monthlyTotals
        .slice(Math.max(0, i - windowMonths), i)
        .map(([, a]) => a);
      if (others.length < minSamples) continue;
      const typical = median(others);
      if (typical <= 0) continue;
      const excess = amount - typical;
      if (amount > typical * multiplier || excess >= minOver) {
        anomalies.push({
          category,
          month,
          amount,
          typical,
          multiplier: amount / typical,
          excess,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.excess - a.excess);
}
