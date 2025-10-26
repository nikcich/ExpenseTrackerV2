import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import { useFilteredExpenses } from "@/hooks/expenses";

export function TableView() {
  const expenses = useFilteredExpenses();
  return (
    <div className={styles.container}>
      <DataTable items={expenses} />
    </div>
  );
}
