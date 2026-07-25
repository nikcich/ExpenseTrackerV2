import { SsdiPayPeriod, Expense } from "@/types/types";
import styles from "./SSDI.module.scss";

export const TWP_LIMIT = 9;

export type TwpStatus = "under" | "twp" | "cessation" | "exhausted";

export type MonthlyRow = {
  monthKey: string;
  label: string;
  earned: number;
  deposit: number;
  twpStatus: TwpStatus;
  inGracePeriod: boolean;
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

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatMonthKeyLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return formatMonthLabel(new Date(y, m - 1, 1));
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

const TWP_WINDOW_YEARS = 5;

export type MonthlyRowsResult = {
  rows: MonthlyRow[];
  twpCount: number;
  cessationKey: string | null;
  gracePeriodEnd: string | null;
  isCompliant: boolean;
};

export function computeMonthlyRows(
  periods: SsdiPayPeriod[],
  sgaMonthlyAmount: number,
  year: number,
  getExpenseById: (id: string) => Expense | undefined,
): MonthlyRowsResult {
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

  const allSortedKeys = [...new Set([...earnedMap.keys(), ...depositMap.keys()])].sort();

  const statusMap = new Map<string, TwpStatus>();
  for (const key of allSortedKeys) {
    const earned = earnedMap.get(key) ?? 0;
    if (earned <= sgaMonthlyAmount) {
      statusMap.set(key, "under");
      continue;
    }
    const [ky, km] = key.split("-").map(Number);
    const windowStartKey = formatMonthKey(new Date(ky - TWP_WINDOW_YEARS, km - 1, 1));
    const exceededCount = allSortedKeys.filter(
      (k) => k >= windowStartKey && k <= key && (earnedMap.get(k) ?? 0) > sgaMonthlyAmount,
    ).length;
    statusMap.set(key, exceededCount <= TWP_LIMIT ? "twp" : "exhausted");
  }

  let twpCount = 0;
  if (allSortedKeys.length > 0) {
    const latestKey = allSortedKeys[allSortedKeys.length - 1];
    const [latestY, latestM] = latestKey.split("-").map(Number);
    const twpWindowStartKey = formatMonthKey(new Date(latestY - TWP_WINDOW_YEARS, latestM - 1, 1));
    twpCount = allSortedKeys.filter(
      (k) => k >= twpWindowStartKey && k <= latestKey && statusMap.get(k) === "twp",
    ).length;
  }

  const cessationKey = allSortedKeys.find((k) => statusMap.get(k) === "exhausted") ?? null;
  let gracePeriodEnd: string | null = null;
  if (cessationKey) {
    const [cy, cm] = cessationKey.split("-").map(Number);
    gracePeriodEnd = formatMonthKey(new Date(cy, cm + 2, 1));
    for (let i = 0; i < 3; i++) {
      const graceKey = formatMonthKey(new Date(cy, cm - 1 + i, 1));
      const earned = earnedMap.get(graceKey) ?? 0;
      if (statusMap.has(graceKey) && earned > sgaMonthlyAmount) {
        statusMap.set(graceKey, "cessation");
      }
    }
  }

  const gracePeriodKeys = new Set<string>();
  if (cessationKey) {
    const [cy, cm] = cessationKey.split("-").map(Number);
    for (let i = 0; i < 3; i++) {
      gracePeriodKeys.add(formatMonthKey(new Date(cy, cm - 1 + i, 1)));
    }
  }

  const filteredKeys = allSortedKeys.filter((key) => key.startsWith(yearPrefix));
  const rows: MonthlyRow[] = filteredKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return {
      monthKey: key,
      label: formatMonthLabel(date),
      earned: earnedMap.get(key) ?? 0,
      deposit: depositMap.get(key) ?? 0,
      twpStatus: statusMap.get(key) ?? "under",
      inGracePeriod: gracePeriodKeys.has(key),
    };
  });

  const isCompliant = !rows.some((r) => r.twpStatus === "exhausted");

  return { rows, twpCount, cessationKey, gracePeriodEnd, isCompliant };
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
              row.twpStatus === "cessation" ? styles.statusOver :
              row.twpStatus === "twp" ? styles.statusTwp :
              styles.statusUnder
            }>
              {row.twpStatus === "exhausted" && "✕ Over SGA (Exhausted)"}
              {row.twpStatus === "cessation" && "Over SGA (Cessation Period)"}
              {row.twpStatus === "twp" && "TWP Month Used"}
              {row.twpStatus === "under" && !row.inGracePeriod && "Under SGA"}
              {row.twpStatus === "under" && row.inGracePeriod && "Under SGA (Cessation Period)"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
