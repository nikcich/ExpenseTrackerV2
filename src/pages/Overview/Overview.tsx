import { useExpensesStore } from "@/store/store";
import { useMemo, useState } from "react";
import { CoreTable } from "@/components/DataTable/DataTable";
import { AiOutlineInbox } from "react-icons/ai";
import { MonthPills } from "./MonthPills";
import { SummaryCards } from "./SummaryCards";
import { NetSparkline } from "./NetSparkline";
import { DonutChart } from "./DonutChart";
import { getLast12Months, computeMonthData, getMonthExpenses, EMPTY_DATA } from "./utils";
import styles from "./Overview.module.scss";

export function Overview() {
  const months = useMemo(() => getLast12Months(), []);
  const [selectedIndex, setSelectedIndex] = useState(months.length - 1);
  const { value: allExpenses } = useExpensesStore();
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allMonthsData = useMemo(() => {
    if (!allExpenses) return months.map(() => EMPTY_DATA);
    return months.map((m) => computeMonthData(allExpenses, m));
  }, [allExpenses, months]);

  const current = allMonthsData[selectedIndex];
  const prev =
    selectedIndex > 0 ? allMonthsData[selectedIndex - 1] : EMPTY_DATA;
  const sparklineData = allMonthsData.map((d) => d.net);
  const currentExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return getMonthExpenses(allExpenses, months[selectedIndex]);
  }, [allExpenses, months, selectedIndex]);

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
            rsu={current.rsu}
            prevRealIncome={prev.realIncome}
            prevTotalSpent={prev.totalSpent}
            prevNet={prev.net}
            prevSavings={prev.savings}
            prevRsu={prev.rsu}
          />
          <NetSparkline
            data={sparklineData}
            months={months}
            selectedIndex={selectedIndex}
          />
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
