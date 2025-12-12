import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { BarChart } from "../../components/charts/BarChart";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { useMemo } from "react";

export const RangeIncomeExpenseChartCore = ({
  legend = true,
  legendDirection = "v",
}: {
  legend?: boolean;
  legendDirection?: "v" | "h";
}) => {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  }, [filteredExpenses]);

  const totalIncome = useMemo(() => {
    return filteredIncome.reduce((acc, income) => acc + income.amount, 0);
  }, [filteredIncome]);

  const totalSavings = useMemo(() => {
    return filteredSavings.reduce((acc, savings) => acc + savings.amount, 0);
  }, [filteredSavings]);

  return (
    <BarChart
      horizontal={true}
      x={[""]}
      legend={legend}
      legendDirection={legendDirection}
      barCharts={[
        {
          name: "Expenses",
          y: [Math.abs(totalExpenses)],
          color: "#bb0000ff",
        },
        {
          name: "Income",
          y: [Math.abs(totalIncome)],
          color: "#00a100ff",
        },
        {
          name: "Savings",
          y: [Math.abs(totalSavings)],
          color: "#ffd000ff",
        },
      ]}
    />
  );
};

export function RangeIncomeExpenseChart() {
  return (
    <GenericPage title="Income vs Expenses" footer={<BrushScrubber />}>
      <RangeIncomeExpenseChartCore />
    </GenericPage>
  );
}
