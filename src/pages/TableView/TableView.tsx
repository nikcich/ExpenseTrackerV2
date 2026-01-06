import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredRetirement,
  useFilteredSavings,
} from "@/hooks/expenses";

export function TableView() {
  const expenses = useFilteredExpenses();
  const income = useFilteredIncome();
  const savings = useFilteredSavings(false);
  const retirements = useFilteredRetirement();

  return (
    <div className={styles.container}>
      <DataTable items={[...expenses, ...income, ...savings, ...retirements]} />
    </div>
  );
}
