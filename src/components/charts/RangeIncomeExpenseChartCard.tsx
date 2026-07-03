import { ChartCard } from "./ChartCard";
import { BarChart } from "./BarChart";

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
    <ChartCard>
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
    </ChartCard>
  );
}
