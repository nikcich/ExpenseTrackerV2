import { useExpensesStore, useRsuVests, useBalanceSnapshots } from "@/store/store";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Spinner, SegmentGroup } from "@chakra-ui/react";
import { CoreTable } from "@/components/DataTable/DataTable";
import { AiOutlineInbox } from "react-icons/ai";
import { MonthPills } from "./MonthPills";
import { SummaryCards } from "./SummaryCards";
import { NetSparkline } from "./NetSparkline";
import { DonutChart } from "./DonutChart";
import { getLast12Months, getLastNYears, computeMonthData, computeYearData, computeAllData, getMonthExpenses, getYearExpenses, computeYtdFromExpenses, EMPTY_DATA } from "./utils";
import { useSettingsStore } from "@/store/SettingsStore";
import { formatCurrency, formatDate, parseLocalDate } from "@/utils/utils";
import styles from "./Overview.module.scss";

function endOfMonth(target: Date): Date {
  return new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
}

function InvestmentsCard({ cutoffDate }: { cutoffDate: Date }) {
  const { vests } = useRsuVests();
  const { snapshots } = useBalanceSnapshots();

  const filteredVests = vests.filter((v) => parseLocalDate(v.vestDate) <= cutoffDate);
  const filteredSnapshots = snapshots.filter((s) => parseLocalDate(s.date) <= cutoffDate);

  const totalShares = filteredVests.reduce((s, v) => s + v.shares, 0);
  const totalValue = filteredVests.reduce((s, v) => s + v.shares * v.price, 0);

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
              <div className={styles.investItem}>
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
            {totalDebtsBalance > 0 && (
              <><span className={styles.valueNeg}>{formatCurrency(totalDebtsBalance)}</span>{" debts"}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

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

function OverviewContent() {
  const [mode, setMode] = useState<OverviewMode>("MONTHLY");
  const periods = useMemo(() => {
    if (mode === "MONTHLY") return getLast12Months();
    if (mode === "YEARLY") return getLastNYears(5);
    return [new Date()];
  }, [mode]);
  const [selectedIndex, setSelectedIndex] = useState(periods.length - 1);
  const { value: allExpenses } = useExpensesStore();
  const disabledTags = useSettingsStore("disabledTags");
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIndex(periods.length - 1);
  }, [mode]);

  const filteredExpensesRaw = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(
      (e) =>
        !disabledTags.some((tag) => e.tags.includes(tag)) ||
        e.tags.length === 0
    );
  }, [allExpenses, disabledTags]);

  const deferredExpenses = useDeferredValue(filteredExpensesRaw);

  const toggleCategory = (name: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
  const sparklineData = mode === "ALL" ? [] : allPeriodsData.map((d) => d.net);
  const currentExpenses = useMemo(() => {
    if (!deferredExpenses) return [];
    if (mode === "ALL") return deferredExpenses;
    const fn = mode === "MONTHLY" ? getMonthExpenses : getYearExpenses;
    return fn(deferredExpenses, periods[index]);
  }, [deferredExpenses, periods, index, mode]);

  const filteredExpenses = useMemo(() => {
    if (disabledCategories.size === 0) return currentExpenses;
    const otherCategories = new Set(current.categories.slice(8).map((c) => c.name));
    return currentExpenses.filter((e) => {
      const tag = e.tags[0] || "Untagged";
      if (disabledCategories.has(tag)) return false;
      if (disabledCategories.has("Other") && otherCategories.has(tag)) return false;
      return true;
    });
  }, [currentExpenses, disabledCategories, current.categories]);

  const noData = currentExpenses.length === 0;
  const cutoffDate = mode === "ALL"
    ? new Date()
    : mode === "MONTHLY"
      ? endOfMonth(periods[index])
      : new Date(periods[index].getFullYear(), 11, 31, 23, 59, 59);

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
          formatLabel={(d) => mode === "MONTHLY" ? d.toLocaleString("default", { month: "short", year: "numeric" }) : String(d.getFullYear())}
        />
      )}
      {noData ? (
        <div className={styles.emptyState}>
          <AiOutlineInbox size={48} />
          <span className={styles.emptyText}>
            {mode === "ALL" ? "No data" : `No data for this ${mode === "MONTHLY" ? "month" : "year"}`}
          </span>
          <span className={styles.emptyHint}>
            {mode === "ALL" ? "Add some expenses to get started" : `Try selecting a different ${mode === "MONTHLY" ? "month" : "year"}`}
          </span>
        </div>
      ) : (
        <>
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
              formatLabel={(d) => mode === "MONTHLY" ? d.toLocaleString("default", { month: "short" }) : String(d.getFullYear())}
            />
          )}
          <div className={styles.overviewRow}>
            <div className={`${styles.card} ${styles.donutCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Spending by Category</span>
              </div>
              <DonutChart
                categories={current.categories}
                totalSpent={current.totalSpent}
                disabledCategories={disabledCategories}
                onToggle={toggleCategory}
              />
            </div>
            <InvestmentsCard cutoffDate={cutoffDate} />
          </div>
          <div className={`${styles.card} ${styles.tableCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>All Transactions ({filteredExpenses.length})</span>
            </div>
            <div className={styles.tableWrapper}>
              <CoreTable items={filteredExpenses} selectable={false} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
