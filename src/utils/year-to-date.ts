import { Expense } from "@/types/types";
import { filterYear } from "@/utils/expense-utils";

export function filterAllExpensesYear(
  income: Expense[],
  expenses: Expense[],
  savings: Expense[],
  beforeNow: number = 0
): [Expense[], Expense[], Expense[]] {
  const filteredIncome = filterYear(income, beforeNow);
  const filteredExpenses = filterYear(expenses, beforeNow);
  const filteredSavings = filterYear(savings, beforeNow);

  return [filteredIncome, filteredExpenses, filteredSavings];
}

const getMonthKey = (i: number) => {
  return new Date(2025, i - 1, 1).toLocaleString("default", { month: "short" });
};

export function groupAndSum(data: Expense[]): { group: string; total: number }[] {
  const monthlyTotals: { [key: string]: number } = {};
  const groupedData: { group: string; total: number }[] = [];
  const sortedData = data
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 1; i <= 12; i++) {
    const monthKey = getMonthKey(i);
    monthlyTotals[monthKey] = 0;
  }

  for (const expense of sortedData) {
    const date = new Date(expense.date);
    const monthKey = getMonthKey(date.getMonth() + 1);
    monthlyTotals[monthKey] += expense.amount;
  }

  let runningTotal = 0;
  for (let i = 1; i <= 12; i++) {
    const currentMonthKey = getMonthKey(i);

    runningTotal += monthlyTotals[currentMonthKey];

    groupedData.push({
      group: currentMonthKey,
      total: runningTotal,
    });
  }

  return groupedData;
}

export function withTransparency(hexColor: string, rank: number, total: number) {
  const step = 255 / (total + 1);
  const alpha = Math.max(0, 255 - rank * step);

  const alphaHex = Math.round(alpha).toString(16).padStart(2, "0");

  return hexColor.slice(0, 7) + alphaHex;
}

export function createChart(
  name: string,
  color: string,
  sortedGroupedExpenses: { group: string; total: number }[],
  groups: string[]
) {
  return {
    name,
    y: groups.map((group) => {
      const expenseValue =
        sortedGroupedExpenses.find((e) => e.group === group)?.total ?? 0;
      return Math.abs(expenseValue);
    }),
    color,
  };
}

export function getYearsInRange(range: [Date, Date]): number[] {
  const start = range[0];
  const end = range[1];
  const years: number[] = [];

  const current = new Date(start);
  while (current.getFullYear() <= end.getFullYear()) {
    years.push(current.getFullYear());
    current.setFullYear(current.getFullYear() + 1);
  }

  return years;
}

