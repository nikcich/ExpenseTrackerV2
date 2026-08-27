import { useCallback, useMemo, useState } from "react";
import { CoreTable } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart } from "@/components/charts/LineChart";
import { BreakdownToggle, Breakdown } from "@/components/charts/BreakdownToggle";
import { DonutChart } from "@/pages/Overview/DonutChart";
import { Expense } from "@/types/types";
import { byGroup, getExpenseKind, ExpenseKind, tagLabel } from "@/utils/expense-utils";
import { FiInbox } from "react-icons/fi";
import { formatCurrency, formatDate, parseLocalDate } from "@/utils/utils";
import styles from "./InsightsView.module.scss";

const isIncomeItem = (e: Expense) => getExpenseKind(e) === "income";
const isSavingsItem = (e: Expense) => getExpenseKind(e) === "savings";

type InsightsStats = {
  income: number;
  spent: number;
  savings: number;
  net: number;
};

function computeStats(items: Expense[]): InsightsStats {
  let income = 0;
  let spent = 0;
  let savings = 0;

  for (const e of items) {
    if (isIncomeItem(e)) {
      income += Math.abs(e.amount);
    } else if (isSavingsItem(e)) {
      savings += e.amount;
    } else {
      spent += e.amount;
    }
  }

  return { income, spent, savings, net: income - spent };
}

const categorize = (
  items: Expense[],
  keyOf: (e: Expense) => string
): { name: string; amount: number }[] => {
  const catMap = new Map<string, number>();
  for (const e of items) {
    if (isIncomeItem(e) || isSavingsItem(e)) continue;
    const key = keyOf(e);
    catMap.set(key, (catMap.get(key) ?? 0) + e.amount);
  }
  return [...catMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

type MonthlySeries = {
  x: string[];
  spent: number[];
  income: number[];
  savings: number[];
};

function computeMonthlySeries(items: Expense[]): MonthlySeries {
  const monthMap = new Map<string, { spent: number; income: number; savings: number }>();
  for (const e of items) {
    const d = parseLocalDate(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { spent: 0, income: 0, savings: 0 };
    if (isIncomeItem(e)) entry.income += Math.abs(e.amount);
    else if (isSavingsItem(e)) entry.savings += e.amount;
    else entry.spent += e.amount;
    monthMap.set(key, entry);
  }
  const keys = [...monthMap.keys()].sort();
  return {
    x: keys.map((k) => {
      const [y, m] = k.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
    }),
    spent: keys.map((k) => monthMap.get(k)?.spent ?? 0),
    income: keys.map((k) => monthMap.get(k)?.income ?? 0),
    savings: keys.map((k) => monthMap.get(k)?.savings ?? 0),
  };
}

type TrendTrace = { name: string; y: number[]; color: string };

export function InsightsView({
  items,
  emptyTitle,
  emptyDescription,
  variant = "selection",
}: {
  items: Expense[];
  emptyTitle: string;
  emptyDescription: string;
  variant?: "selection" | "group";
}) {
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(
    () => new Set()
  );
  const [breakdown, setBreakdown] = useState<Breakdown>("GROUPS");

  const stats = useMemo(() => computeStats(items), [items]);
  const series = useMemo(() => computeMonthlySeries(items), [items]);

  const groupKind: ExpenseKind | null =
    variant === "group" && items.length > 0 ? getExpenseKind(items[0]) : null;
  const groupTotal = useMemo(
    () => items.reduce((sum, e) => sum + e.amount, 0),
    [items]
  );

  const tagCategories = useMemo(
    () => categorize(items, tagLabel),
    [items]
  );
  const groupCategories = useMemo(() => categorize(items, byGroup), [items]);
  const categories =
    breakdown === "GROUPS" ? groupCategories : tagCategories;

  const changeBreakdown = useCallback((next: Breakdown) => {
    setBreakdown(next);
    setDisabledCategories(new Set());
  }, []);

  const toggleCategory = useCallback((name: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const meta = useMemo(() => {
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const startIso = sorted[0].date;
    const endIso = sorted[sorted.length - 1].date;
    const spanDays =
      Math.floor(
        (parseLocalDate(endIso).getTime() - parseLocalDate(startIso).getTime()) /
          86_400_000
      ) + 1;
    const biggestExpense = items
      .filter((e) => !isIncomeItem(e) && !isSavingsItem(e))
      .reduce<Expense | null>(
        (max, e) => (!max || e.amount > max.amount ? e : max),
        null
      );
    return { startIso, endIso, spanDays, avgPerDay: stats.spent / spanDays, biggestExpense };
  }, [items, stats.spent]);

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <EmptyState
          icon={<FiInbox />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  const trendTraces: TrendTrace[] =
    variant === "group"
      ? [
          groupKind === "income"
            ? { name: "Income", y: series.income, color: "#4ade80" }
            : groupKind === "savings"
              ? { name: "Savings", y: series.savings, color: "#facc15" }
              : { name: "Spent", y: series.spent, color: "#f87171" },
        ]
      : [
          { name: "Spent", y: series.spent, color: "#f87171" },
          { name: "Income", y: series.income, color: "#4ade80" },
        ];

  const showDonut = variant !== "group" || groupKind === "expense";

  return (
    <>
      {variant === "group" ? (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>
              {groupKind === "income"
                ? "Income"
                : groupKind === "savings"
                  ? "Savings"
                  : "Total"}
            </span>
            <span
              className={`${styles.cardValue} ${
                groupKind === "income"
                  ? styles.valuePos
                  : groupKind === "savings"
                    ? styles.valueNeutral
                    : groupTotal > 0
                      ? styles.valueNeg
                      : styles.valuePos
              }`}
            >
              {formatCurrency(groupTotal)}
            </span>
            <span className={styles.cardCaption}>
              {groupKind === "income"
                ? "money received in this group"
                : groupKind === "savings"
                  ? "transferred to savings"
                  : "negative = net reimbursement"}
            </span>
          </div>
          {meta && (
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Items</span>
              <span className={styles.cardValue}>{items.length}</span>
              <span className={styles.cardCaption}>
                over {meta.spanDays} days
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Spent</span>
            <span className={`${styles.cardValue} ${styles.valueNeg}`}>
              {formatCurrency(stats.spent)}
            </span>
            <span className={styles.cardCaption}>excludes transfers</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Real Income</span>
            <span className={`${styles.cardValue} ${styles.valuePos}`}>
              {formatCurrency(stats.income)}
            </span>
            <span className={styles.cardCaption}>paychecks, refunds</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Net</span>
            <span
              className={`${styles.cardValue} ${stats.net >= 0 ? styles.valuePos : styles.valueNeg}`}
            >
              {formatCurrency(stats.net)}
            </span>
            <span className={styles.cardCaption}>income − spend</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Savings</span>
            <span className={`${styles.cardValue} ${styles.valueNeutral}`}>
              {formatCurrency(stats.savings)}
            </span>
            <span className={styles.cardCaption}>transfers to savings</span>
          </div>
        </div>
      )}

      {meta && (
        <div className={styles.metaCard}>
          <div className={styles.metaItem}>
            <span className={styles.cardLabel}>Date Span</span>
            <span className={styles.metaValue}>
              {formatDate(meta.startIso)} → {formatDate(meta.endIso)}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.cardLabel}>Days Covered</span>
            <span className={styles.metaValue}>{meta.spanDays}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.cardLabel}>Avg Spend / Day</span>
            <span className={styles.metaValue}>{formatCurrency(meta.avgPerDay)}</span>
          </div>
          {meta.biggestExpense && (
            <div className={styles.metaItem}>
              <span className={styles.cardLabel}>Largest Expense</span>
              <span className={styles.metaValue}>
                {formatCurrency(meta.biggestExpense.amount)}
                <span style={{ fontWeight: 400, color: "var(--fg-subtle, #6b6b7b)" }}>
                  {" "}
                  {meta.biggestExpense.description}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {(showDonut || series.x.length > 1) && (
        <div className={styles.chartRow} style={showDonut ? undefined : { gridTemplateColumns: "1fr" }}>
          {showDonut && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Spending by Category</span>
                <BreakdownToggle value={breakdown} onChange={changeBreakdown} />
              </div>
              <DonutChart
                categories={categories}
                totalSpent={stats.spent}
                disabledCategories={disabledCategories}
                onToggle={toggleCategory}
              />
            </div>
          )}
          {series.x.length > 1 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Monthly Trend</span>
              </div>
              <div className={styles.chartBody}>
                <LineChart x={series.x} barCharts={trendTraces} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`${styles.card} ${styles.tableCard}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            Transactions ({items.length})
          </span>
        </div>
        <div className={styles.tableWrapper}>
          <CoreTable items={items} selectable={false} />
        </div>
      </div>
    </>
  );
}
