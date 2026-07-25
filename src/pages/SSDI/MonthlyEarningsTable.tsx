import { SsdiPayPeriod, Expense } from "@/types/types";
import styles from "./SSDI.module.scss";

export const TWP_LIMIT = 9;

export type TwpStatus = "under" | "twp" | "exhausted";

export type MonthlyRow = {
  monthKey: string;
  label: string;
  earned: number;
  deposit: number;
  twpStatus: TwpStatus;
};

function diffInDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function computeTwpCount(rows: MonthlyRow[]): number {
  return rows.filter((r) => r.twpStatus !== "under").length;
}

export function computeMonthlyRows(
  periods: SsdiPayPeriod[],
  sgaMonthlyAmount: number,
  year: number,
  getExpenseById: (id: string) => Expense | undefined,
): MonthlyRow[] {
  const earnedMap = new Map<string, number>();
  const depositMap = new Map<string, number>();
  const yearPrefix = `${year}-`;

  for (const period of periods) {
    const begin = parseLocalDate(period.beginDate);
    const end = parseLocalDate(period.endDate);
    if (isNaN(begin.getTime()) || isNaN(end.getTime())) continue;

    const totalDays = diffInDays(begin, end) + 1;
    if (totalDays <= 0) continue;
    const dailyRate = period.grossEarnings / totalDays;

    let cursor = new Date(begin);
    while (cursor <= end) {
      const monthStart = getMonthStart(cursor);
      const monthEnd = getMonthEnd(cursor);
      const overlapStart = cursor < monthStart ? monthStart : cursor;
      const overlapEnd = end > monthEnd ? monthEnd : end;
      const daysInOverlap = diffInDays(overlapStart, overlapEnd) + 1;

      if (daysInOverlap > 0) {
        const key = formatMonthKey(overlapStart);
        const existing = earnedMap.get(key) ?? 0;
        earnedMap.set(key, existing + dailyRate * daysInOverlap);
      }

      cursor = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 1);
    }

    const expense = getExpenseById(period.depositExpenseId);
    if (expense) {
      const depositDate = new Date(expense.date);
      const key = formatMonthKey(depositDate);
      const existing = depositMap.get(key) ?? 0;
      depositMap.set(key, existing + Math.abs(expense.amount));
    }
  }

  const allMonthKeys = new Set([...earnedMap.keys(), ...depositMap.keys()]);
  const sortedKeys = [...allMonthKeys].filter((key) => key.startsWith(yearPrefix)).sort();

  let twpCount = 0;
  const rows: MonthlyRow[] = sortedKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const earned = earnedMap.get(key) ?? 0;
    let twpStatus: TwpStatus = "under";
    if (earned > sgaMonthlyAmount) {
      twpCount++;
      twpStatus = twpCount <= TWP_LIMIT ? "twp" : "exhausted";
    }
    return {
      monthKey: key,
      label: formatMonthLabel(date),
      earned,
      deposit: depositMap.get(key) ?? 0,
      twpStatus,
    };
  });

  return rows;
}

type Props = {
  rows: MonthlyRow[];
};

export function MonthlyEarningsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className={styles.emptyPreview}>
        Add pay periods with begin/end dates and gross earnings to see the monthly breakdown.
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Month</th>
          <th>Gross Earning Total</th>
          <th>Deposit Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.monthKey}>
            <td>{row.label}</td>
            <td className={styles.amountCell}>${fmt(row.earned)}</td>
            <td className={styles.amountCell}>${fmt(row.deposit)}</td>
            <td className={
              row.twpStatus === "exhausted" ? styles.statusOver :
              row.twpStatus === "twp" ? styles.statusTwp :
              styles.statusUnder
            }>
              {row.twpStatus === "exhausted" && "✕ Over SGA (Exhausted)"}
              {row.twpStatus === "twp" && "⚠ TWP Month Used"}
              {row.twpStatus === "under" && "✓ Under SGA"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
