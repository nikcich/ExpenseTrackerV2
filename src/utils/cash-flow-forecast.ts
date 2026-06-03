import { format, parseISO, addDays, getDaysInMonth, isAfter, isValid } from "date-fns";

export type PayPeriod = "biweekly" | "weekly" | "semimonthly" | "monthly";

export interface IncomeRule {
  amount: number;
  payPeriod: PayPeriod;
  firstPaycheckDate: string;
  semimonthlyPayday1: number;
  semimonthlyPayday2: number;
}

export interface ExpenseRule {
  day: number;
  amount: number;
}

export interface CashFlowEvent {
  date: string;
  event: string;
  change: number | null;
  checking: number;
  savings: number;
}

export interface CashFlowSummary {
  endingChecking: number;
  endingSavings: number;
  lowestChecking: number;
}

export interface CashFlowConfig {
  startBalance: number;
  reserve: number;
  startDate: string;
  endDate: string;
  incomeStreams: IncomeRule[];
  expenses: ExpenseRule[];
}

function addPayday(map: Map<string, number[]>, date: string, amount: number) {
  const existing = map.get(date) ?? [];
  existing.push(amount);
  map.set(date, existing);
}

function buildPaydays(
  start: Date,
  end: Date,
  incomeStreams: IncomeRule[]
): Map<string, number[]> {
  const paydayMap = new Map<string, number[]>();

  for (const stream of incomeStreams) {
    if (stream.payPeriod === "semimonthly") {
      let current = start;
      while (!isAfter(current, end)) {
        const daysInMonth = getDaysInMonth(current);
        const day1 = Math.min(stream.semimonthlyPayday1, daysInMonth);
        const day2 = Math.min(stream.semimonthlyPayday2, daysInMonth);
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), day1), "yyyy-MM-dd"), stream.amount);
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), day2), "yyyy-MM-dd"), stream.amount);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    } else if (stream.payPeriod === "monthly") {
      if (!stream.firstPaycheckDate) continue;
      const firstPaycheck = parseISO(stream.firstPaycheckDate);
      if (!isValid(firstPaycheck)) continue;
      const payDay = firstPaycheck.getDate();
      let current = new Date(firstPaycheck.getFullYear(), firstPaycheck.getMonth(), 1);
      while (!isAfter(current, end)) {
        const clampedDay = Math.min(payDay, getDaysInMonth(current));
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), clampedDay), "yyyy-MM-dd"), stream.amount);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    } else {
      if (!stream.firstPaycheckDate) continue;
      const firstPaycheck = parseISO(stream.firstPaycheckDate);
      if (!isValid(firstPaycheck)) continue;
      const interval = stream.payPeriod === "biweekly" ? 14 : 7;
      let d = firstPaycheck;
      while (!isAfter(d, end)) {
        addPayday(paydayMap, format(d, "yyyy-MM-dd"), stream.amount);
        d = addDays(d, interval);
      }
    }
  }

  return paydayMap;
}

export function computeCashFlowForecast(
  config: CashFlowConfig
): { events: CashFlowEvent[]; summary: CashFlowSummary } {
  const { startBalance, reserve, startDate, endDate, incomeStreams, expenses } = config;

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let balance = startBalance;
  let savings = 0;
  let lowestBalance = balance;

  const paydayMap = buildPaydays(start, end, incomeStreams);

  const events: CashFlowEvent[] = [
    {
      date: format(start, "yyyy-MM-dd"),
      event: "Starting Balance",
      change: null,
      checking: balance,
      savings,
    },
  ];

  let current = start;
  while (!isAfter(current, end)) {
    const dateStr = format(current, "yyyy-MM-dd");
    let hasEvent = false;

    const paydayAmounts = paydayMap.get(dateStr);
    if (paydayAmounts) {
      for (const amount of paydayAmounts) {
        balance += amount;
        events.push({ date: dateStr, event: "Paycheck", change: amount, checking: balance, savings });
        hasEvent = true;
      }
    }

    for (const expense of expenses) {
      const clampedDay = Math.min(expense.day, getDaysInMonth(current));
      if (current.getDate() === clampedDay) {
        balance -= expense.amount;
        events.push({ date: dateStr, event: `Expense (${expense.day})`, change: -expense.amount, checking: balance, savings });
        hasEvent = true;
      }
    }

    const lastDay = getDaysInMonth(current);
    if (current.getDate() === lastDay) {
      const transfer = Math.max(0, balance - reserve);
      if (transfer > 0) {
        balance -= transfer;
        savings += transfer;
        events.push({ date: dateStr, event: "Savings Transfer", change: -transfer, checking: balance, savings });
        hasEvent = true;
      }
    }

    if (hasEvent) {
      lowestBalance = Math.min(lowestBalance, balance);
    }

    current = addDays(current, 1);
  }

  return {
    events,
    summary: { endingChecking: balance, endingSavings: savings, lowestChecking: lowestBalance },
  };
}
