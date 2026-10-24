import { ChartCard } from "./ChartCard";
import { BarChart } from "./BarChart";
import { EXPENSE_CHART_COLOR, INCOME_CHART_COLOR, SAVINGS_CHART_COLOR } from "@/utils/colors";

export function RangeIncomeExpenseChartCard({
  totalExpenses,
  totalIncome,
  totalSavings,
  legend = true,
  legendDirection = "v",
}: {
  totalExpenses: number;
  totalIncome: number;
  totalSavings: number;
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  return (
    <ChartCard plain>
      <BarChart
        horizontal={true}
        x={[""]}
        legend={legend}
        legendDirection={legendDirection}
        barCharts={[
          {
            name: "Expenses",
            y: [Math.abs(totalExpenses)],
            color: EXPENSE_CHART_COLOR,
          },
          {
            name: "Income",
            y: [Math.abs(totalIncome)],
            color: INCOME_CHART_COLOR,
          },
          {
            name: "Savings",
            y: [Math.abs(totalSavings)],
            color: SAVINGS_CHART_COLOR,
          },
        ]}
      />
    </ChartCard>
  );
}
