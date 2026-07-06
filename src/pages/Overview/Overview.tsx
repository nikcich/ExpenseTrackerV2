import { useExpensesStore, useRsuVests, useBalanceSnapshots } from "@/store/store";
import { useMemo, useState } from "react";
import { CoreTable } from "@/components/DataTable/DataTable";
import { AiOutlineInbox } from "react-icons/ai";
import { MonthPills } from "./MonthPills";
import { SummaryCards } from "./SummaryCards";
import { NetSparkline } from "./NetSparkline";
import { DonutChart } from "./DonutChart";
import { getLast12Months, computeMonthData, getMonthExpenses, computeYtdFromExpenses, EMPTY_DATA } from "./utils";
import { useSettingsStore } from "@/store/SettingsStore";
import styles from "./Overview.module.scss";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string): string {
  return localDate(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function endOfMonth(target: Date): Date {
  return new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
}

function InvestmentsCard({ month }: { month: Date }) {
  const { vests } = useRsuVests();
  const { snapshots } = useBalanceSnapshots();
  const cutoff = endOfMonth(month);

  const filteredVests = vests.filter((v) => localDate(v.vestDate) <= cutoff);
  const filteredSnapshots = snapshots.filter((s) => localDate(s.date) <= cutoff);

  const totalShares = filteredVests.reduce((s, v) => s + v.shares, 0);
  const totalValue = filteredVests.reduce((s, v) => s + v.shares * v.price, 0);

  const latestByAccount = new Map<string, typeof filteredSnapshots[0]>();
  for (const s of filteredSnapshots) {
    const existing = latestByAccount.get(s.accountName);
    if (!existing || localDate(s.date) > localDate(existing.date)) {
      latestByAccount.set(s.accountName, s);
    }
  }

  let totalAssetsBalance = 0;
  let totalDebtsBalance = 0;
  for (const s of latestByAccount.values()) {
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
        <span className={styles.cardTitle}>Investments</span>
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
        <div className={styles.investSection}>
          <span className={styles.investSectionTitle}>Latest Balances</span>
          {latestByAccount.size === 0 ? (
            <span className={styles.cardEmpty}>No data</span>
          ) : (
            <div className={styles.investGrid}>
              {[...latestByAccount.entries()].map(([name, snap]) => (
                <div key={name} className={styles.investItem}>
                  <span className={styles.investLabel}>{name}</span>
                  <span className={`${styles.investValue} ${(snap.type ?? "asset") === "debt" ? styles.valueNeg : styles.money}`}>{formatCurrency(snap.balance)}</span>
                  <span className={styles.investDate}>{formatDate(snap.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
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
  const months = useMemo(() => getLast12Months(), []);
  const [selectedIndex, setSelectedIndex] = useState(months.length - 1);
  const { value: allExpenses } = useExpensesStore();
  const disabledTags = useSettingsStore("disabledTags");
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  const filteredExpensesRaw = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(
      (e) =>
        !disabledTags.some((tag) => e.tags.includes(tag)) ||
        e.tags.length === 0
    );
  }, [allExpenses, disabledTags]);

  const toggleCategory = (name: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allMonthsData = useMemo(() => {
    if (!filteredExpensesRaw) return months.map(() => EMPTY_DATA);
    return months.map((m) => computeMonthData(filteredExpensesRaw, m));
  }, [filteredExpensesRaw, months]);

  const current = allMonthsData[selectedIndex];
  const prev =
    selectedIndex > 0 ? allMonthsData[selectedIndex - 1] : EMPTY_DATA;
  const ytd = useMemo(() => computeYtdFromExpenses(filteredExpensesRaw, months[selectedIndex]), [filteredExpensesRaw, months, selectedIndex]);
  const sparklineData = allMonthsData.map((d) => d.net);
  const currentExpenses = useMemo(() => {
    if (!filteredExpensesRaw) return [];
    return getMonthExpenses(filteredExpensesRaw, months[selectedIndex]);
  }, [filteredExpensesRaw, months, selectedIndex]);

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

  return (
    <div className={styles.page}>
      <MonthPills
        months={months}
        selectedIndex={selectedIndex}
        onChange={setSelectedIndex}
      />
      {noData ? (
        <div className={styles.emptyState}>
          <AiOutlineInbox size={48} />
          <span className={styles.emptyText}>No data for this month</span>
          <span className={styles.emptyHint}>Try selecting a different month</span>
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
          <NetSparkline
            data={sparklineData}
            months={months}
            selectedIndex={selectedIndex}
          />
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
            <InvestmentsCard month={months[selectedIndex]} />
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
