import { SsdiPayPeriod } from "@/types/types";
import { Expense } from "@/types/types";
import styles from "./SSDI.module.scss";

type Props = {
  periods: SsdiPayPeriod[];
  getExpenseById: (id: string) => Expense | undefined;
  onUpdate: (id: string, period: SsdiPayPeriod) => void;
  onRemove: (id: string) => void;
};

export function PayPeriodsTable({ periods, getExpenseById, onUpdate, onRemove }: Props) {
  if (periods.length === 0) {
    return (
      <div className={styles.emptyPreview}>
        No pay periods yet. Search for income deposits above to get started.
      </div>
    );
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Employer</th>
          <th>Begin Date</th>
          <th>End Date</th>
          <th>Deposit Date</th>
          <th>Deposit Amount</th>
          <th>Gross Earnings</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {[...periods].sort((a, b) => {
          const dateA = getExpenseById(a.depositExpenseId)?.date ?? "";
          const dateB = getExpenseById(b.depositExpenseId)?.date ?? "";
          return dateA.localeCompare(dateB);
        }).map((period) => {
          const expense = getExpenseById(period.depositExpenseId);
          const employer = expense?.description ?? "—";
          const depositDate = expense
            ? new Date(expense.date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
            : "—";
          const depositAmount = expense ? Math.abs(expense.amount) : 0;

          return (
            <tr key={period.id}>
              <td>{employer}</td>
              <td>
                <input
                  type="date"
                  className={styles.tableInput}
                  value={period.beginDate}
                  onChange={(e) => onUpdate(period.id, { ...period, beginDate: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="date"
                  className={styles.tableInput}
                  value={period.endDate}
                  onChange={(e) => onUpdate(period.id, { ...period, endDate: e.target.value })}
                />
              </td>
              <td>{depositDate}</td>
              <td className={styles.amountCell}>
                ${depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td>
                <input
                  type="number"
                  className={styles.tableInput}
                  value={period.grossEarnings || ""}
                  placeholder="0.00"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdate(period.id, { ...period, grossEarnings: isNaN(val) ? 0 : val });
                  }}
                />
              </td>
              <td>
                <button className={styles.deleteButton} onClick={() => onRemove(period.id)}>
                  ✕
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
