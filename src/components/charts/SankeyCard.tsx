import { ChartCard } from "./ChartCard";
import { Sankey, SankeyData } from "@/components/Sankey/Sankey";

export function SankeyCard({ data }: { data: SankeyData }) {
  return (
    <ChartCard>
      <Sankey data={data} />
    </ChartCard>
  );
}
