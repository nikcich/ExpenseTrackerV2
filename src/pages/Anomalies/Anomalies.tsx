import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useExpenses } from "@/hooks/expenses";
import { detectAnomalies, Anomaly } from "@/utils/anomalies";
import { formatCurrency } from "@/utils/utils";
import { useSettingsStore } from "@/store/SettingsStore";
import { setNavFilter } from "@/store/NavFilterStore";
import { Pages } from "@/types/routes";
import { dateRangeRules, categoryRule, FilterRule } from "@/utils/custom-filter";
import styles from "./Anomalies.module.scss";

const monthLabel = (month: string): string =>
  format(new Date(`${month}-01T00:00:00`), "MMM yyyy");

const pad = (n: number) => String(n).padStart(2, "0");

const monthRange = (month: string): { start: string; end: string } => {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${pad(lastDay)}` };
};

type SortKey = "month" | "category" | "amount" | "typical" | "ratio" | "excess";
type SortDir = "asc" | "desc";

const numericKeys: SortKey[] = ["amount", "typical", "ratio", "excess"];

const AnomalyRow = ({
  anomaly,
  onDoubleClick,
}: {
  anomaly: Anomaly;
  onDoubleClick: (a: Anomaly) => void;
}) => (
  <tr className={styles.row} onDoubleClick={() => onDoubleClick(anomaly)}>
    <td className={styles.date}>{monthLabel(anomaly.month)}</td>
    <td className={styles.category}>{anomaly.category}</td>
    <td className={styles.amount}>{formatCurrency(anomaly.amount)}</td>
    <td className={styles.typical}>{formatCurrency(anomaly.typical)}</td>
    <td className={styles.ratio}>{anomaly.multiplier.toFixed(1)}×</td>
    <td className={styles.excess}>{formatCurrency(anomaly.excess)}</td>
  </tr>
);

export function Anomalies() {
  const navigate = useNavigate();
  const expenses = useExpenses();
  const anomalyMultiplier = useSettingsStore("anomalyMultiplier");
  const anomalyMinOver = useSettingsStore("anomalyMinOver");
  const anomalyWindow = useSettingsStore("anomalyWindow");

  const anomalies = useMemo(
    () =>
      detectAnomalies(expenses, {
        multiplier: anomalyMultiplier,
        minOver: anomalyMinOver,
        windowMonths: anomalyWindow,
      }),
    [expenses, anomalyMultiplier, anomalyMinOver, anomalyWindow]
  );

  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(numericKeys.includes(key) ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...anomalies];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "month":
          cmp = a.month.localeCompare(b.month);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "typical":
          cmp = a.typical - b.typical;
          break;
        case "ratio":
          cmp = a.multiplier - b.multiplier;
          break;
        case "excess":
          cmp = a.excess - b.excess;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [anomalies, sortKey, sortDir]);

  const columns: { key: SortKey; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount" },
    { key: "typical", label: "Typical" },
    { key: "ratio", label: "Ratio" },
    { key: "excess", label: "Over Typical" },
  ];

  const handleOpen = (a: Anomaly) => {
    const { start, end } = monthRange(a.month);
    const rules: FilterRule[] = [
      ...dateRangeRules(start, end),
      categoryRule("tags", a.category),
    ];
    setNavFilter(
      rules,
      `Anomaly · ${monthLabel(a.month)} · ${a.category}`
    );
    navigate(Pages.TableView);
  };

  return (
    <GenericPage title="Anomalies" hasRange={false} needsData={false}>
      <div className={styles.page}>
        <div className={styles.headerCard}>
          <div className={styles.stat}>
            <span className={styles.summaryLabel}>Flagged months</span>
            <span className={styles.summaryValue}>{anomalies.length}</span>
          </div>
          <p className={styles.note}>
            A category's month flags when its total is more than{" "}
            {anomalyMultiplier}× its normal month or {formatCurrency(anomalyMinOver)}{" "}
            over it, where "normal" is the median of the previous{" "}
            {anomalyWindow} months.
          </p>
        </div>

        <div className={styles.tableCard}>
          {sorted.length === 0 ? (
            <div className={styles.empty}>
              No anomalies detected. Months where a category's spending jumped
              far above its normal amount will show here.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={styles.sortable}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <span className={styles.sortIndicator}>
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <AnomalyRow
                    key={`${a.category}-${a.month}`}
                    anomaly={a}
                    onDoubleClick={handleOpen}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </GenericPage>
  );
}
