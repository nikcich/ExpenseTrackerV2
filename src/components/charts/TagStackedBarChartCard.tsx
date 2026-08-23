import { useState } from "react";
import { ChartCard } from "./ChartCard";
import { StackedBarChart } from "./StackedBarChart";
import { BreakdownToggle, Breakdown } from "./BreakdownToggle";

type Datum = string | number | Date | null;

type Data = {
  x: Datum[];
  y: Datum[];
  name: string;
  type: "bar";
};

export function TagStackedBarChartCard({
  traces,
  groupTraces,
  legend = true,
  legendDirection = "v",
}: {
  traces: Data[];
  groupTraces?: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  const [breakdown, setBreakdown] = useState<Breakdown>("TAGS");

  return (
    <ChartCard
      toolbar={
        groupTraces ? (
          <BreakdownToggle value={breakdown} onChange={setBreakdown} />
        ) : undefined
      }
    >
      <StackedBarChart
        data={breakdown === "GROUPS" && groupTraces ? groupTraces : traces}
        legend={legend}
        legendDirection={legendDirection}
      />
    </ChartCard>
  );
}
