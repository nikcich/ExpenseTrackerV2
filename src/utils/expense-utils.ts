import { Expense, NonExpenseTags } from "@/types/types";
import { parseDate } from "./utils";
import { format } from "date-fns";

export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string | string[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const keys = keyFn(item);
    const keyList = Array.isArray(keys) ? keys : [keys];

    for (const key of keyList) {
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    }

    return acc;
  }, {} as Record<string, T[]>);
}

export function groupByMultiple<T>(
  items: T[],
  ...keyFns: ((item: T) => string | string[])[]
): any {
  if (keyFns.length === 0) return items;

  const [firstFn, ...rest] = keyFns;
  const grouped = groupBy(items, firstFn);

  if (rest.length === 0) return grouped;

  for (const key in grouped) {
    grouped[key] = groupByMultiple(grouped[key], ...rest);
  }

  return grouped;
}

export function sumGroupedExpenses(grouped: any) {
  const output: { group: string; total: number }[] = [];

  function recurse(obj: any, parentKey = "") {
    if (Array.isArray(obj)) {
      output.push({
        group: parentKey,
        total: obj
          .filter((e) => !e.tags.includes(NonExpenseTags.Income))
          .reduce((sum, e) => sum + e.amount, 0),
      });
      return;
    }

    for (const key in obj) {
      const newKey = parentKey ? `${parentKey} > ${key}` : key;
      recurse(obj[key], newKey);
    }
  }

  recurse(grouped);
  return output;
}

export function groupAndSumExpenses<T>(
  expenses: T[],
  ...keyFns: ((item: T) => string | string[])[]
) {
  const grouped = groupByMultiple(expenses, ...keyFns);
  return sumGroupedExpenses(grouped);
}

export const byYear = (e: Expense) => {
  const year = parseDate(e.date).getFullYear();
  return `${year}‎`;
};
export const byMonth = (e: Expense) => {
  const date = parseDate(e.date);
  const m = date.getMonth();
  const y = date.getFullYear();

  const monthName = new Date(y, m).toLocaleString("default", {
    month: "short",
  });
  return `${monthName} ${y}`;
};
export const byDay = (e: Expense) => {
  const date = parseDate(e.date);
  return format(date, "MM/dd/yyyy");
};
export const byTag = (e: Expense) => e.tags;
