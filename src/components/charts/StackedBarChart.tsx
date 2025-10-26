import Plot from "react-plotly.js";
import { Layout } from "plotly.js";

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

  const categories = Array.from(new Set(parsedData.map((d) => d.category)));
  const groups = Array.from(new Set(parsedData.map((d) => d.group)));

  const traces: Data[] = categories.map((cat) => ({
    x: groups,
    y: groups.map((g) => {
      const item = parsedData.find((d) => d.category === cat && d.group === g);
      return item ? item.total : 0;
    }),
    name: cat,
    type: "bar",
  }));

  return traces;
};

const layout: Partial<Layout> = {
  barmode: "stack",
  autosize: true,
  margin: { t: 40, r: 20, l: 40, b: 60 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#ffffff" },
  legend: { orientation: "h" },
  dragmode: false,
};

export function StackedBarChart({ data }: { data: Data[] }) {
  return (
    <Plot
      data={data}
      layout={layout}
      config={{ displayModeBar: false }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
