import { useState } from "react";
import { ChartCard } from "./ChartCard";
import { StackedBarChart, ChartOpenPayload } from "./StackedBarChart";
import { BreakdownToggle, Breakdown } from "./BreakdownToggle";

type Datum = string | number | Date | null;

type Data = {
  x: Datum[];
  y: Datum[];
  name: string;
  type: "bar";
};

export function AverageSpendingCard({
  traces,
  groupTraces,
  legend = true,
  legendDirection = "v",
  onOpen,
}: {
  traces: Data[];
  groupTraces?: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
  onOpen?: (payload: ChartOpenPayload) => void;
}) {
  const [breakdown, setBreakdown] = useState<Breakdown>("GROUPS");
  const field: ChartOpenPayload["field"] =
    breakdown === "GROUPS" ? "group" : "tags";

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
        onOpen={
          onOpen
            ? (p) => {
                p.field = field;
                onOpen(p);
              }
            : undefined
        }
      />
    </ChartCard>
  );
}
