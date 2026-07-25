import { useState, useMemo, useCallback } from "react";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useSsdiPayPeriods, useSsdiConfig } from "@/store/store";
import { useIncome, useGetExpenseById } from "@/hooks/expenses";
import { PayPeriodsTable } from "./PayPeriodsTable";
import { MonthlyEarningsTable, computeMonthlyRows, TWP_LIMIT, TwpStatus, formatMonthKeyLabel } from "./MonthlyEarningsTable";
import { BarChart } from "@/components/charts/BarChart";
import { MonthPills } from "@/components/MonthPills/MonthPills";
import styles from "./SSDI.module.scss";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SSDI() {
  const { periods, addPeriod, updatePeriod, removePeriod } = useSsdiPayPeriods();
  const { config, saveConfig } = useSsdiConfig();
  const getExpenseById = useGetExpenseById();
  const income = useIncome();

  const [searchTerm, setSearchTerm] = useState("");

  const previewResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return income
      .filter((e) => e.description.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [searchTerm, income]);

  const existingDepositIds = useMemo(
    () => new Set(periods.map((p) => p.depositExpenseId)),
    [periods]
  );

  const addDeposit = useCallback((expenseId: string) => {
    addPeriod({
      id: "",
      beginDate: "",
      endDate: "",
      depositExpenseId: expenseId,
      grossEarnings: 0,
    });
  }, [addPeriod]);

  const year = config?.year ?? new Date().getFullYear();
  const sgaAmount = config?.sgaByYear?.[year] ?? 1620;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    for (const p of periods) {
      if (p.beginDate) years.add(new Date(p.beginDate).getFullYear());
      if (p.endDate) years.add(new Date(p.endDate).getFullYear());
      const exp = getExpenseById(p.depositExpenseId);
      if (exp) years.add(new Date(exp.date).getFullYear());
    }
    return [...years].sort((a, b) => a - b);
  }, [periods, getExpenseById]);

  const filteredPeriods = useMemo(
    () => periods.filter((p) => {
      const expense = getExpenseById(p.depositExpenseId);
      if (expense && new Date(expense.date).getFullYear() === year) return true;
      if (p.beginDate && new Date(p.beginDate).getFullYear() === year) return true;
      if (p.endDate && new Date(p.endDate).getFullYear() === year) return true;
      return false;
    }),
    [periods, year, getExpenseById]
  );

  const { rows: monthlyRows, twpCount, cessationKey, gracePeriodEnd, isCompliant } = useMemo(
    () => computeMonthlyRows(periods, sgaAmount, year, getExpenseById),
    [periods, sgaAmount, year, getExpenseById]
  );

  const chartMonths = useMemo(() => {
    const allMonths = Array.from({ length: 12 }, (_, i) => `${MONTH_NAMES[i]} ${year}`);
    const rowMap = new Map(monthlyRows.map((r) => [r.label, r]));
    return allMonths.map((label) => rowMap.get(label) ?? { label, earned: 0, deposit: 0, twpStatus: "under" as TwpStatus });
  }, [monthlyRows, year]);

  const xTickColors = useMemo(
    () => chartMonths.map((m) => {
      if (m.twpStatus === "exhausted" || m.twpStatus === "cessation") return "#f87171";
      if (m.twpStatus === "twp") return "#eab308";
      return "#4ade80";
    }),
    [chartMonths]
  );

  return (
    <GenericPage title="SSDI Earnings Tracker" hasRange={false} needsData={false}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.configRow}>
            <MonthPills
              months={availableYears.map((y) => new Date(y, 0, 1))}
              selectedIndex={availableYears.indexOf(year)}
              onChange={(i) => {
                const newYear = availableYears[i];
                saveConfig({ ...(config ?? { year: newYear, sgaByYear: {} }), year: newYear });
              }}
              formatLabel={(d) => String(d.getFullYear())}
            />
            <div className={styles.field}>
              <label className={styles.fieldLabel}>SGA Monthly Amount</label>
              <input
                type="number"
                className={styles.fieldInput}
                value={sgaAmount}
                onChange={(e) => {
                  const newSga = parseFloat(e.target.value) || 0;
                  saveConfig({ ...(config ?? { year, sgaByYear: {} }), sgaByYear: { ...config?.sgaByYear, [year]: newSga } });
                }}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Search Income Deposits</span>
          </div>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by deposit name (e.g., KEURIG GREEN MOUNTAIN)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm.trim() && (
            <div className={styles.previewContainer}>
              {previewResults.length === 0 ? (
                <div className={styles.emptyPreview}>No matching income deposits found.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th style={{ width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResults.map((expense) => {
                      const alreadyAdded = existingDepositIds.has(expense.id);
                      return (
                        <tr key={expense.id} style={{ opacity: alreadyAdded ? 0.4 : 1 }}>
                          <td>
                            {new Date(expense.date).toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td>{expense.description}</td>
                          <td className={styles.amountCell}>
                            ${Math.abs(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            {alreadyAdded ? (
                              <span className={styles.addedBadge}>Added</span>
                            ) : (
                              <button
                                className={styles.addButton}
                                onClick={() => addDeposit(expense.id)}
                              >
                                Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Pay Periods</span>
          </div>
          <PayPeriodsTable
            periods={filteredPeriods}
            getExpenseById={getExpenseById}
            onUpdate={updatePeriod}
            onRemove={removePeriod}
          />
        </div>

        <div className={styles.earningsRow}>
          <div className={`${styles.card} ${styles.earningsTable}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Monthly Earnings</span>
            </div>
            <MonthlyEarningsTable rows={monthlyRows} />
          </div>
          <div className={styles.overviewCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Overview Status</span>
            </div>
            <div className={styles.overviewGrid}>
              <span className={styles.overviewLabel}>TWP Months Used</span>
              <span className={styles.overviewValue}>{twpCount} / {TWP_LIMIT}</span>

              <span className={styles.overviewLabel}>Cessation Month</span>
              <span className={styles.overviewValue}>
                {cessationKey ? formatMonthKeyLabel(cessationKey) : "\u2014"}
              </span>

              <span className={styles.overviewLabel}>Grace Period Ends</span>
              <span className={styles.overviewValue}>
                {gracePeriodEnd ? formatMonthKeyLabel(gracePeriodEnd) : "\u2014"}
              </span>

              <span className={styles.overviewLabel}>SSA Compliance</span>
              <span
                className={styles.overviewValue}
                style={{
                  color: isCompliant ? "var(--fg-success, #4ade80)" : "var(--fg-error, #f87171)",
                }}
              >
                {isCompliant ? "OK" : "NON-COMPLIANT"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Monthly Earnings Overview</span>
          </div>
          <BarChart
            x={chartMonths.map((m) => m.label)}
            barCharts={[
              {
                name: "Gross Earnings",
                y: chartMonths.map((m) => m.earned),
                color: "#3b82f6",
              },
              {
                name: "Deposits",
                y: chartMonths.map((m) => m.deposit),
                color: "#6b7280",
              },
            ]}
            legend={true}
            legendDirection="h"
            threshold={{
              value: sgaAmount,
              label: `SGA $${sgaAmount.toLocaleString()}`,
              color: "#ef4444",
            }}
            xTickColors={xTickColors}
          />
        </div>
      </div>
    </GenericPage>
  );
}
