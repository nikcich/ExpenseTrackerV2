import Plot from "react-plotly.js";
import { Layout } from "plotly.js";
import { chartDateCompare } from "@/utils/utils";

type Datum = string | number | Date | null;

type Data = {
  x: Datum[];
  y: Datum[];
  name: string;
  type: "bar";
};

export const parseStackedFormat = (
  data: {
    group: string;
    total: number;
  }[]
): Data[] => {
  const parsedData = data.map((e) => {
    const [category, group] = e.group.split(" > ");
    return { category, group, total: e.total };
  });

  parsedData.sort((a, b) => chartDateCompare(a.group, b.group));

  const categories = Array.from(new Set(parsedData.map((d) => d.category)));
  const groups = Array.from(new Set(parsedData.map((d) => d.group)));

  const traces: Data[] = categories.map((cat) => ({
    x: groups,
    y: groups.map((g) => {
      const item = parsedData.find((d) => d.category === cat && d.group === g);
      return item ? Math.abs(item.total) : 0;
    }),
    name: cat,
    type: "bar",
  }));

  return traces;
};

const layout: Partial<Layout> = {
  barmode: "stack",
  autosize: true,
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#ffffff" },
  dragmode: false,
};

export function StackedBarChart({
  data,
  legend = true,
  legendDirection = "v",
}: {
  data: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
}) {
  return (
    <Plot
      data={data}
      layout={{
        ...layout,
        showlegend: legend,
        legend: { orientation: legendDirection },
        margin: { t: 20, r: 20, l: 40, b: legend ? 60 : 80 },
      }}
      config={{ displayModeBar: false }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler={true}
    />
  );
}
