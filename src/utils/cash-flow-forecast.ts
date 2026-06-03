import { format, parseISO, addDays, getDaysInMonth, isAfter } from "date-fns";

export type PayPeriod = "biweekly" | "weekly" | "semimonthly";

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
  paycheckAmount: number;
  payPeriod: PayPeriod;
  firstPaycheckDate: string;
  semimonthlyPayday1: number;
  semimonthlyPayday2: number;
  expenses: ExpenseRule[];
}

function buildPaydays(
  start: Date,
  end: Date,
  period: PayPeriod,
  firstPaycheckDate: string,
  semimonthlyPayday1: number,
  semimonthlyPayday2: number
): Set<string> {
  const paydays = new Set<string>();

  if (period === "semimonthly") {
    let current = start;
    while (!isAfter(current, end)) {
      const daysInMonth = getDaysInMonth(current);
      const day1 = Math.min(semimonthlyPayday1, daysInMonth);
      const day2 = Math.min(semimonthlyPayday2, daysInMonth);
      paydays.add(format(new Date(current.getFullYear(), current.getMonth(), day1), "yyyy-MM-dd"));
      paydays.add(format(new Date(current.getFullYear(), current.getMonth(), day2), "yyyy-MM-dd"));
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return paydays;
  }

  const firstPaycheck = parseISO(firstPaycheckDate);
  const interval = period === "biweekly" ? 14 : 7;
  let d = firstPaycheck;
  while (!isAfter(d, end)) {
    paydays.add(format(d, "yyyy-MM-dd"));
    d = addDays(d, interval);
  }
  return paydays;
}

export function computeCashFlowForecast(
  config: CashFlowConfig
): { events: CashFlowEvent[]; summary: CashFlowSummary } {
  const { startBalance, reserve, startDate, endDate, paycheckAmount, payPeriod, firstPaycheckDate, semimonthlyPayday1, semimonthlyPayday2, expenses } = config;

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let balance = startBalance;
  let savings = 0;
  let lowestBalance = balance;

  const paydays = buildPaydays(start, end, payPeriod, firstPaycheckDate, semimonthlyPayday1, semimonthlyPayday2);

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

    if (paydays.has(dateStr)) {
      balance += paycheckAmount;
      events.push({ date: dateStr, event: "Paycheck", change: paycheckAmount, checking: balance, savings });
      hasEvent = true;
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
