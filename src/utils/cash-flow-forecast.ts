import { format, parseISO, addDays, addMonths, getDaysInMonth, isAfter, isValid } from "date-fns";

export type PayPeriod = "biweekly" | "weekly" | "semimonthly" | "monthly" | "quarterly" | "semiannual" | "annual";

export interface IncomeRule {
  name?: string;
  amount: number;
  payPeriod: PayPeriod;
  firstPaycheckDate: string;
  semimonthlyPayday1: number;
  semimonthlyPayday2: number;
}

export interface ExpenseRule {
  name?: string;
  day: number;
  amount: number;
  period?: PayPeriod;
  firstDate?: string;
}

export type EventType = "income" | "expense" | "transfer" | "starting";

export interface CashFlowEvent {
  date: string;
  event: string;
  change: number | null;
  checking: number;
  savings: number;
  type: EventType;
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

function addPayday(map: Map<string, {amount: number; streamIndex: number}[]>, date: string, amount: number, streamIndex: number) {
  const existing = map.get(date) ?? [];
  existing.push({ amount, streamIndex });
  map.set(date, existing);
}

function buildPaydays(
  start: Date,
  end: Date,
  incomeStreams: IncomeRule[]
): Map<string, {amount: number; streamIndex: number}[]> {
  const paydayMap = new Map<string, {amount: number; streamIndex: number}[]>();

  for (let i = 0; i < incomeStreams.length; i++) {
    const stream = incomeStreams[i];
    if (stream.payPeriod === "semimonthly") {
      let current = start;
      while (!isAfter(current, end)) {
        const daysInMonth = getDaysInMonth(current);
        const day1 = Math.min(stream.semimonthlyPayday1, daysInMonth);
        const day2 = Math.min(stream.semimonthlyPayday2, daysInMonth);
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), day1), "yyyy-MM-dd"), stream.amount, i);
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), day2), "yyyy-MM-dd"), stream.amount, i);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    } else if (["monthly", "quarterly", "semiannual", "annual"].includes(stream.payPeriod)) {
      if (!stream.firstPaycheckDate) continue;
      const firstPaycheck = parseISO(stream.firstPaycheckDate);
      if (!isValid(firstPaycheck)) continue;
      const payDay = firstPaycheck.getDate();
      const monthInterval = stream.payPeriod === "quarterly" ? 3 : stream.payPeriod === "semiannual" ? 6 : stream.payPeriod === "annual" ? 12 : 1;
      let current = new Date(firstPaycheck.getFullYear(), firstPaycheck.getMonth(), 1);
      while (!isAfter(current, end)) {
        const clampedDay = Math.min(payDay, getDaysInMonth(current));
        addPayday(paydayMap, format(new Date(current.getFullYear(), current.getMonth(), clampedDay), "yyyy-MM-dd"), stream.amount, i);
        current = addMonths(current, monthInterval);
      }
    } else {
      if (!stream.firstPaycheckDate) continue;
      const firstPaycheck = parseISO(stream.firstPaycheckDate);
      if (!isValid(firstPaycheck)) continue;
      const interval = stream.payPeriod === "biweekly" ? 14 : 7;
      let d = firstPaycheck;
      while (!isAfter(d, end)) {
        addPayday(paydayMap, format(d, "yyyy-MM-dd"), stream.amount, i);
        d = addDays(d, interval);
      }
    }
  }

  return paydayMap;
}

function buildExpenses(
  start: Date,
  end: Date,
  expenses: ExpenseRule[]
): Map<string, {amount: number; streamIndex: number}[]> {
  const expenseMap = new Map<string, {amount: number; streamIndex: number}[]>();

  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i];
    const period = exp.period || "monthly";

    if (period === "monthly") {
      let current = start;
      while (!isAfter(current, end)) {
        const clampedDay = Math.min(exp.day, getDaysInMonth(current));
        const dateStr = format(new Date(current.getFullYear(), current.getMonth(), clampedDay), "yyyy-MM-dd");
        addPayday(expenseMap, dateStr, exp.amount, i);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    } else if (period === "weekly" || period === "biweekly") {
      if (!exp.firstDate) continue;
      const first = parseISO(exp.firstDate);
      if (!isValid(first)) continue;
      const interval = period === "biweekly" ? 14 : 7;
      let d = first;
      while (!isAfter(d, end)) {
        addPayday(expenseMap, format(d, "yyyy-MM-dd"), exp.amount, i);
        d = addDays(d, interval);
      }
    } else {
      if (!exp.firstDate) continue;
      const first = parseISO(exp.firstDate);
      if (!isValid(first)) continue;
      const monthInterval = period === "quarterly" ? 3 : period === "semiannual" ? 6 : 12;
      const refDay = first.getDate();
      let current = new Date(first.getFullYear(), first.getMonth(), 1);
      while (!isAfter(current, end)) {
        const clampedDay = Math.min(refDay, getDaysInMonth(current));
        const dateStr = format(new Date(current.getFullYear(), current.getMonth(), clampedDay), "yyyy-MM-dd");
        if (!isAfter(parseISO(dateStr), end)) {
          addPayday(expenseMap, dateStr, exp.amount, i);
        }
        current = addMonths(current, monthInterval);
      }
    }
  }

  return expenseMap;
}

export function computeCashFlowForecast(
  config: CashFlowConfig
): { events: CashFlowEvent[]; summary: CashFlowSummary } {
  const { startBalance, reserve, startDate, endDate, incomeStreams, expenses } = config;

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (!isValid(start) || !isValid(end)) {
    return {
      events: [],
      summary: { endingChecking: startBalance, endingSavings: 0, lowestChecking: startBalance },
    };
  }

  let balance = startBalance;
  let savings = 0;
  let lowestBalance = balance;

  const paydayMap = buildPaydays(start, end, incomeStreams);
  const expenseMap = buildExpenses(start, end, expenses);

  const events: CashFlowEvent[] = [
    {
      date: format(start, "yyyy-MM-dd"),
      event: "Starting Balance",
      change: null,
      type: "starting",
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
      for (const { amount, streamIndex } of paydayAmounts) {
        balance += amount;
        const name = incomeStreams[streamIndex]?.name || "Income";
        events.push({ date: dateStr, event: name, change: amount, checking: balance, savings, type: "income" });
        hasEvent = true;
      }
    }

    const expenseAmounts = expenseMap.get(dateStr);
    if (expenseAmounts) {
      for (const { amount, streamIndex } of expenseAmounts) {
        balance -= amount;
        const eventName = expenses[streamIndex]?.name || `Expense ${streamIndex + 1}`;
        events.push({ date: dateStr, event: eventName, change: -amount, checking: balance, savings, type: "expense" });
        hasEvent = true;
      }
    }

    const lastDay = getDaysInMonth(current);
    if (current.getDate() === lastDay) {
      const transfer = Math.max(0, balance - reserve);
      if (transfer > 0) {
        balance -= transfer;
        savings += transfer;
        events.push({ date: dateStr, event: "Savings Transfer", change: -transfer, checking: balance, savings, type: "transfer" });
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
