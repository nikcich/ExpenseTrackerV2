import { useExpensesStore, useRsuVests, useBalanceSnapshots, useStocks, useGrants } from "@/store/store";
import { useCallback, useEffect, useMemo, useState, useDeferredValue, memo } from "react";
import { Spinner, SegmentGroup } from "@chakra-ui/react";
import { CoreTable } from "@/components/DataTable/DataTable";
import { MonthPills } from "@/components/MonthPills/MonthPills";
import { SummaryCards } from "./SummaryCards";
import { NetSparkline } from "./NetSparkline";
import { DonutChart } from "./DonutChart";
import { getLast12Months, getLastNYears, computeMonthData, computeYearData, computeAllData, getMonthExpenses, getYearExpenses, computeYtdFromExpenses, EMPTY_DATA } from "./utils";
import { useSettingsStore } from "@/store/SettingsStore";
import { formatCurrency, formatDate, parseLocalDate } from "@/utils/utils";
import { byGroup, getExpenseKind, tagLabel } from "@/utils/expense-utils";
import { BreakdownToggle, Breakdown } from "@/components/charts/BreakdownToggle";
import { Expense } from "@/types/types";
import { FilterRule } from "@/utils/custom-filter";
import { setNavFilter } from "@/store/NavFilterStore";
import { categoryRule, emptyGroupRule, dateRangeRules, periodDateRange } from "@/utils/custom-filter";
import { Pages } from "@/types/routes";
import { useNavigate } from "react-router-dom";
import styles from "./Overview.module.scss";

function endOfMonth(target: Date): Date {
  return new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
}

const InvestmentsCard = memo(function InvestmentsCard({ cutoffDate }: { cutoffDate: Date }) {
  const { vests } = useRsuVests();
  const { snapshots } = useBalanceSnapshots();
  const { stocks } = useStocks();
  const { grants } = useGrants();

  const stockMap = new Map(stocks.map((s) => [s.id, s]));
  const grantMap = new Map(grants.map((g) => [g.id, g]));

  const filteredVests = vests.filter((v) => parseLocalDate(v.vestDate) <= cutoffDate);
  const filteredSnapshots = snapshots.filter((s) => parseLocalDate(s.date) <= cutoffDate);

  const totalShares = filteredVests.reduce((s, v) => s + v.shares, 0);
  const totalValue = filteredVests.reduce((s, v) => {
    const grant = grantMap.get(v.grantId);
    const stock = grant ? stockMap.get(grant.stockId) : undefined;
    return s + v.shares * (stock?.currentPrice ?? v.basisPrice);
  }, 0);

  const latestByAccount = new Map<string, typeof filteredSnapshots[0]>();
  for (const s of filteredSnapshots) {
    const existing = latestByAccount.get(s.accountName);
    if (!existing || parseLocalDate(s.date) > parseLocalDate(existing.date)) {
      latestByAccount.set(s.accountName, s);
    }
  }

  const nonZeroBalances = [...latestByAccount.entries()].filter(([, s]) => s.balance !== 0);

  let totalAssetsBalance = 0;
  let totalDebtsBalance = 0;
  for (const s of nonZeroBalances.map(([, s]) => s)) {
    if ((s.type ?? "asset") === "debt") {
      totalDebtsBalance += Math.abs(s.balance);
    } else {
      totalAssetsBalance += s.balance;
    }
  }
  const netWorth = totalValue + totalAssetsBalance - totalDebtsBalance;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Accounts</span>
      </div>
      <div className={styles.investCardBody}>
        {filteredVests.length > 0 && (
          <div className={styles.investSection}>
            <span className={styles.investSectionTitle}>RSU</span>
            <div className={styles.investGrid}>
              <div className={styles.investItem}>
                <span className={styles.investValue}>{totalShares.toLocaleString()}</span>
                <span className={styles.investLabel}>Shares</span>
              </div>
              <div className={`${styles.investItem}`}>
                <span className={`${styles.investValue} ${styles.money}`}>{formatCurrency(totalValue)}</span>
                <span className={styles.investLabel}>Value at Vest</span>
              </div>
              <div className={styles.investItem}>
                <span className={styles.investValue}>{vests.length}</span>
                <span className={styles.investLabel}>Events</span>
              </div>
            </div>
          </div>
        )}
        {nonZeroBalances.length > 0 && (
          <div className={styles.investSection}>
            <span className={styles.investSectionTitle}>Latest Balances</span>
            <div className={styles.investGrid}>
              {nonZeroBalances.map(([name, snap]) => (
                <div key={name} className={styles.investItem}>
                  <span className={styles.investLabel}>{name}</span>
                  <span className={`${styles.investValue} ${(snap.type ?? "asset") === "debt" ? styles.valueNeg : styles.money}`}>{formatCurrency(snap.balance)}</span>
                  <span className={styles.investDate}>{formatDate(snap.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={styles.investSection}>
          <span className={styles.investSectionTitle}>Net Worth</span>
          <div className={styles.investGrid}>
            <span className={`${styles.investValue} ${netWorth >= 0 ? styles.valuePos : styles.valueNeg}`}>
              {formatCurrency(netWorth)}
            </span>
          </div>
          <span className={styles.netWorthBreakdown}>
            {totalValue > 0 && (
              <><span className={styles.valuePos}>{formatCurrency(totalValue)}</span>{" RSU"}</>
            )}
            {totalValue > 0 && totalAssetsBalance > 0 && <span className={styles.valuePos}>{" + "}</span>}
            {totalAssetsBalance > 0 && (
              <><span className={styles.valuePos}>{formatCurrency(totalAssetsBalance)}</span>{" assets"}</>
            )}
            {(totalValue > 0 || totalAssetsBalance > 0) && totalDebtsBalance > 0 && <span className={styles.valueNeg}>{" − "}</span>}
            {(totalDebtsBalance > 0) && (
              <><span className={styles.valueNeg}>{formatCurrency(totalDebtsBalance)}</span>{" debts"}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

export function Overview() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Spinner color="var(--fg-muted, #a0a0ab)" />
        </div>
      </div>
    );
  }

  return <OverviewContent />;
}

type OverviewMode = "MONTHLY" | "YEARLY" | "ALL";

const computeCategories = (
  expenses: Expense[],
  keyOf: (e: Expense) => string
): { name: string; amount: number }[] => {
  const categoryMap = new Map<string, number>();
  for (const e of expenses) {
    if (getExpenseKind(e) !== "expense") continue;
    const key = keyOf(e);
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + e.amount);
  }
  return [...categoryMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

function OverviewContent() {
  const [mode, setMode] = useState<OverviewMode>("MONTHLY");
  const [breakdown, setBreakdown] = useState<Breakdown>("GROUPS");
  const periods = useMemo(() => {
    if (mode === "MONTHLY") return getLast12Months();
    if (mode === "YEARLY") return getLastNYears(5);
    return [new Date()];
  }, [mode]);
  const [selectedIndex, setSelectedIndex] = useState(periods.length - 1);
  const { value: allExpenses } = useExpensesStore();
  const disabledTags = useSettingsStore("disabledTags");
  const disabledGroups = useSettingsStore("disabledGroups");

  useEffect(() => {
    setSelectedIndex(periods.length - 1);
  }, [mode]);

  const filteredExpensesRaw = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(
      (e) =>
        (!disabledTags.some((tag) => e.tags.includes(tag)) ||
          e.tags.length === 0) &&
        (!e.group || !disabledGroups.includes(e.group))
    );
  }, [allExpenses, disabledTags, disabledGroups]);

  const deferredExpenses = useDeferredValue(filteredExpensesRaw);

  const allPeriodsData = useMemo(() => {
    if (!deferredExpenses) return periods.map(() => EMPTY_DATA);
    if (mode === "ALL") return [computeAllData(deferredExpenses)];
    const fn = mode === "MONTHLY" ? computeMonthData : computeYearData;
    return periods.map((p) => fn(deferredExpenses, p));
  }, [deferredExpenses, periods, mode]);

  const index = mode === "ALL" ? 0 : Math.min(selectedIndex, allPeriodsData.length - 1);
  const current = allPeriodsData[index];
  const prev = mode === "ALL" ? EMPTY_DATA : (index > 0 ? allPeriodsData[index - 1] : EMPTY_DATA);
  const ytd = useMemo(() => {
    if (!deferredExpenses) return { ytdIncome: 0, ytdSpent: 0, ytdNet: 0, ytdSavings: 0 };
    if (mode === "MONTHLY") return computeYtdFromExpenses(deferredExpenses, periods[index]);
    const d = allPeriodsData[index];
    return { ytdIncome: d.realIncome, ytdSpent: d.totalSpent, ytdNet: d.net, ytdSavings: d.savings };
  }, [deferredExpenses, periods, index, mode, allPeriodsData]);
  const sparklineData = useMemo(
    () => (mode === "ALL" ? [] : allPeriodsData.map((d) => d.net)),
    [allPeriodsData, mode]
  );
  const currentExpenses = useMemo(() => {
    if (!deferredExpenses) return [];
    if (mode === "ALL") return deferredExpenses;
    const fn = mode === "MONTHLY" ? getMonthExpenses : getYearExpenses;
    return fn(deferredExpenses, periods[index]);
  }, [deferredExpenses, periods, index, mode]);

  const noData = currentExpenses.length === 0;

  const tagCategories = useMemo(
    () => computeCategories(currentExpenses, tagLabel),
    [currentExpenses]
  );
  const groupCategories = useMemo(() => computeCategories(currentExpenses, byGroup), [currentExpenses]);
  const categories = breakdown === "GROUPS" ? groupCategories : tagCategories;

  const cutoffDate = useMemo(
    () =>
      mode === "ALL"
        ? new Date()
        : mode === "MONTHLY"
          ? endOfMonth(periods[index])
          : new Date(periods[index].getFullYear(), 11, 31, 23, 59, 59),
    [mode, periods, index]
  );

  const formatPeriodLabel = useCallback(
    (d: Date) =>
      mode === "MONTHLY"
        ? d.toLocaleString("default", { month: "short", year: "numeric" })
        : String(d.getFullYear()),
    [mode]
  );
  const formatSparkLabel = useCallback(
    (d: Date) =>
      mode === "MONTHLY"
        ? d.toLocaleString("default", { month: "short" })
        : String(d.getFullYear()),
    [mode]
  );

  const navigate = useNavigate();

  const handleOpenCategory = useCallback(
    (name: string, field: "tags" | "group") => {
      const rules: FilterRule[] = [];
      if (field === "group" && name === "Ungrouped") {
        rules.push(emptyGroupRule());
      } else if (name !== "Other") {
        rules.push(categoryRule(field, name));
      }
      if (mode !== "ALL" && periods[index]) {
        const range = periodDateRange(mode, formatPeriodLabel(periods[index]));
        if (range) {
          rules.push(...dateRangeRules(range.start, range.end));
        }
      }
      if (rules.length === 0) return;
      setNavFilter(rules, `Overview · ${name}`);
      navigate(Pages.TableView);
    },
    [mode, periods, index, navigate, formatPeriodLabel]
  );

  return (
    <div className={styles.page}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
        <SegmentGroup.Root value={mode} onValueChange={(e) => setMode(e.value as OverviewMode)}>
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={["MONTHLY", "YEARLY", "ALL"]} />
        </SegmentGroup.Root>
      </div>
      {mode !== "ALL" && (
        <MonthPills
          months={periods}
          selectedIndex={index}
          onChange={setSelectedIndex}
          formatLabel={formatPeriodLabel}
        />
      )}
      <SummaryCards
        realIncome={current.realIncome}
        totalSpent={current.totalSpent}
        net={current.net}
        savings={current.savings}
        prevRealIncome={prev.realIncome}
        prevTotalSpent={prev.totalSpent}
        prevNet={prev.net}
        prevSavings={prev.savings}
        ytdIncome={ytd.ytdIncome}
        ytdSpent={ytd.ytdSpent}
        ytdNet={ytd.ytdNet}
        ytdSavings={ytd.ytdSavings}
      />
      {mode !== "ALL" && (
        <NetSparkline
          data={sparklineData}
          months={periods}
          selectedIndex={index}
          formatLabel={formatSparkLabel}
        />
      )}

      <div className={styles.overviewRow}>
        {!noData && (
          <div className={`${styles.card} ${styles.donutCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Spending by Category</span>
              <BreakdownToggle value={breakdown} onChange={setBreakdown} />
            </div>
            <DonutChart
              categories={categories}
              totalSpent={current.totalSpent}
              onOpen={(name) =>
                handleOpenCategory(name, breakdown === "GROUPS" ? "group" : "tags")
              }
            />
          </div>
        )}
        <InvestmentsCard cutoffDate={cutoffDate} />
      </div>
      {!noData && (
        <div className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              All Transactions ({currentExpenses.length})
            </span>
          </div>
          <div className={styles.tableWrapper}>
            <CoreTable items={currentExpenses} selectable={false} />
          </div>
        </div>
      )}
    </div>
  );
}
