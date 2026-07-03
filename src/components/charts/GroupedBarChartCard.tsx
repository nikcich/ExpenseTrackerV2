import { ChartCard } from "./ChartCard";
import { BarChart } from "./BarChart";

type Datum = string | number | Date | null;

export function GroupedBarChartCard({
  barCharts,
  groups,
  legend = true,
  legendDirection = "v",
}: {
  barCharts: { name: string; y: number[]; color: string }[];
  groups: Datum[];
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  return (
    <ChartCard>
      <BarChart
        x={groups}
        legend={legend}
        legendDirection={legendDirection}
        barCharts={barCharts}
      />
    </ChartCard>
  );
}
