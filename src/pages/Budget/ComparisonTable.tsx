import { formatCurrency } from "@/utils/utils";
import { variance, type PlanRow } from "@/utils/plan-vs-actual";
import styles from "./Budget.module.scss";

const dash = "—";

const VarianceCell = ({ actual, plan, enabled }: { actual: number; plan: number; enabled: boolean }) => {
  if (!enabled) return <td className={styles.muted}>{dash}</td>;
  const v = variance(actual, plan);
  if (v.amount === 0) return <td className={styles.muted}>{formatCurrency(0)}</td>;
  return (
    <td className={v.over ? styles.over : styles.under}>
      {v.over ? "+" : ""}
      {formatCurrency(v.amount)}
    </td>
  );
};

export function ComparisonTable({
  title,
  rows,
  showForecast,
  onOpen,
}: {
  title: string;
  rows: PlanRow[];
  showForecast: boolean;
  onOpen: (row: PlanRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className={styles.tableCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Budget</th>
            {showForecast && <th>Forecast</th>}
            <th>Actual</th>
            <th>vs Budget</th>
            {showForecast && <th>vs Forecast</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={styles.row} onDoubleClick={() => onOpen(row)}>
              <td className={styles.category}>
                {row.category}
                {!row.hasBudget && <span className={styles.badge}>unbudgeted</span>}
              </td>
              <td>{row.hasBudget ? formatCurrency(row.budget) : dash}</td>
              {showForecast && <td>{row.hasForecast ? formatCurrency(row.forecast) : dash}</td>}
              <td className={styles.strong}>{formatCurrency(row.actual)}</td>
              <VarianceCell actual={row.actual} plan={row.budget} enabled={row.hasBudget} />
              {showForecast && (
                <VarianceCell actual={row.actual} plan={row.forecast} enabled={row.hasForecast} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
