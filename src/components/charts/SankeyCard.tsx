import { ReactNode } from "react";
import { ChartCard } from "./ChartCard";
import { Sankey, SankeyData } from "@/components/Sankey/Sankey";

export function SankeyCard({
  data,
  toolbar,
}: {
  data: SankeyData;
  toolbar?: ReactNode;
}) {
  return (
    <ChartCard toolbar={toolbar}>
      <Sankey data={data} />
    </ChartCard>
  );
}
