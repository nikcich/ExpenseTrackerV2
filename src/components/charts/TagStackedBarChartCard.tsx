import { ChartCard } from "./ChartCard";
import { StackedBarChart } from "./StackedBarChart";

type Datum = string | number | Date | null;

type Data = {
  x: Datum[];
  y: Datum[];
  name: string;
  type: "bar";
};

export function TagStackedBarChartCard({
  traces,
  legend = true,
  legendDirection = "v",
}: {
  traces: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  return (
    <ChartCard>
      <StackedBarChart
        data={traces}
        legend={legend}
        legendDirection={legendDirection}
      />
    </ChartCard>
  );
}
