import { Expense, NonExpenseTags } from "@/types/types";
import { parseDate } from "@/utils/utils";
import { getMonth, getYear, subMonths } from "date-fns";

export type MonthData = {
  realIncome: number;
  totalSpent: number;
  net: number;
  savings: number;
  categories: { name: string; amount: number }[];
};

export const EMPTY_DATA: MonthData = {
  realIncome: 0,
  totalSpent: 0,
  net: 0,
  savings: 0,
  categories: [],
};

export function getLast12Months(): Date[] {
  const now = new Date();
  const months: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(subMonths(now, i));
  }
  return months;
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleString("default", { month: "short" });
}

export function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `-${s}` : s;
}

export function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function computeMonthData(expenses: Expense[], target: Date): MonthData {
  const income: Expense[] = [];
  const spent: Expense[] = [];
  let savings = 0;

  for (const e of expenses) {
    if (getYear(parseDate(e.date)) !== getYear(target)) continue;
    if (getMonth(parseDate(e.date)) !== getMonth(target)) continue;

    if (e.tags.includes(NonExpenseTags.Income)) {
      income.push(e);
    } else if (e.tags.includes(NonExpenseTags.Savings) || e.tags.includes(NonExpenseTags.Retirement)) {
      savings += e.amount;
    } else {
      spent.push(e);
    }
  }

  const realIncome = income.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const totalSpent = spent.reduce((sum, e) => sum + e.amount, 0);
  const net = realIncome - totalSpent;

  const catMap = new Map<string, number>();
  for (const e of spent) {
    const tag = e.tags[0] || "Untagged";
    catMap.set(tag, (catMap.get(tag) || 0) + e.amount);
  }
  const categories = [...catMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { realIncome, totalSpent, net, savings, categories };
}

export function getMonthExpenses(expenses: Expense[], target: Date): Expense[] {
  return expenses.filter((e) => {
    if (getYear(parseDate(e.date)) !== getYear(target)) return false;
    if (getMonth(parseDate(e.date)) !== getMonth(target)) return false;
    return true;
  });
}
