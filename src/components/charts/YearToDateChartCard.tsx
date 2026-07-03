import { ChartCard } from "./ChartCard";
import { LineChart } from "./LineChart";

type Datum = string | number | Date | null;

export function YearToDateChartCard({
  charts,
  groups,
  legend = true,
  legendDirection = "v",
}: {
  charts: { name: string; y: number[]; color: string }[];
  groups: Datum[];
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  return (
    <ChartCard>
      <LineChart
        legend={legend}
        legendDirection={legendDirection}
        x={groups}
        barCharts={charts}
      />
    </ChartCard>
  );
}
