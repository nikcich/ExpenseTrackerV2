import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredRetirement,
  useFilteredSavings,
} from "@/hooks/expenses";
import { GenericPage } from "@/components/GenericPage/GenericPage";

export function TableView() {
  const expenses = useFilteredExpenses();
  const income = useFilteredIncome();
  const savings = useFilteredSavings(false);
  const retirements = useFilteredRetirement();

  const allItems = [...expenses, ...income, ...savings, ...retirements];

  return (
    <div className={styles.container}>
      <GenericPage title="Expenses" hasRange={false} needsData={false}>
        <DataTable items={allItems} />
      </GenericPage>
    </div>
  );
}
