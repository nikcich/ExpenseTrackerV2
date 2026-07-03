import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { useMemo } from "react";
import { RangeIncomeExpenseChartCard } from "@/components/charts/RangeIncomeExpenseChartCard";

export function RangeIncomeExpenseChart() {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0),
    [filteredExpenses]
  );
  const totalIncome = useMemo(
    () => filteredIncome.reduce((acc, income) => acc + income.amount, 0),
    [filteredIncome]
  );
  const totalSavings = useMemo(
    () => filteredSavings.reduce((acc, savings) => acc + savings.amount, 0),
    [filteredSavings]
  );

  return (
    <GenericPage title="Income vs Expenses" footer={<BrushScrubber />}>
      <div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <RangeIncomeExpenseChartCard
          totalExpenses={totalExpenses}
          totalIncome={totalIncome}
          totalSavings={totalSavings}
        />
      </div>
    </GenericPage>
  );
}
