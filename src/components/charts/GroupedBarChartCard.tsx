import { ChartCard } from "./ChartCard";
import { BarChart } from "./BarChart";
import { ChartOpenPayload } from "./StackedBarChart";

type Datum = string | number | Date | null;

export function GroupedBarChartCard({
  barCharts,
  groups,
  legend = true,
  legendDirection = "v",
  onOpen,
}: {
  barCharts: { name: string; y: number[]; color: string }[];
  groups: Datum[];
  legend?: boolean;
  legendDirection?: "v" | "h";
  onOpen?: (payload: ChartOpenPayload) => void;
}) {
  return (
    <ChartCard>
      <BarChart
        x={groups}
        legend={legend}
        legendDirection={legendDirection}
        barCharts={barCharts}
        onOpen={onOpen}
      />
    </ChartCard>
  );
}
