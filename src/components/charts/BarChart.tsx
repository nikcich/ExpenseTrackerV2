import Plot from "react-plotly.js";
import styles from "./BarChart.module.scss";

type Datum = string | number | Date | null;

interface BarChartProps<T extends Datum> {
  x: T[];
  barCharts: BarChartItem[];
  horizontal?: boolean;
  legend?: boolean;
  legendDirection?: "v" | "h";
  threshold?: {
    value: number;
    label?: string;
    color?: string;
  };
  xTickColors?: string[];
}

interface BarChartItem {
  name: string;
  y: number[];
  color: string;
}

export const BarChart = <T extends Datum>({
  x,
  barCharts,
  horizontal = false,
  legend = true,
  legendDirection = "v",
  threshold,
  xTickColors,
}: BarChartProps<T>) => {
  const tickAnnotations = xTickColors?.map((color, i) => ({
    xref: "x" as const,
    yref: "paper" as const,
    x: x[i] as string | number,
    y: -0.12,
    text: String(x[i]),
    showarrow: false,
    font: { color, size: 11 },
    xanchor: "center" as const,
  })) ?? [];

  const existingAnnotations = threshold?.label ? [{
    xref: "paper" as const,
    yref: "y" as const,
    x: 1,
    y: threshold.value,
    text: threshold.label,
    showarrow: false,
    font: { color: threshold.color ?? "#ff4444", size: 12 },
    xanchor: "right" as const,
    yshift: 10,
  }] : [];

  return (
    <div className={styles.container}>
      <div className={styles.plotContainer}>
        <Plot
          data={barCharts.map((chart) => ({
            x: horizontal ? chart.y : x,
            y: horizontal ? x : chart.y,
            type: "bar",
            name: chart.name,
            orientation: horizontal ? "h" : "v",
            marker: { color: chart.color },
          }))}
          layout={{
            autosize: true,
            margin: {
              t: 40,
              r: 20,
              l: horizontal ? (legend ? 70 : 20) : 40,
              b: horizontal ? 25 : legend ? 60 : 80,
            },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: "#ffffff",
            },
            dragmode: false,
            showlegend: legend,
            legend: { orientation: legendDirection },
            ...(xTickColors ? { xaxis: { showticklabels: false } } : {}),
            ...(threshold ? { shapes: [{
              type: "line",
              xref: "paper",
              yref: "y",
              x0: 0,
              x1: 1,
              y0: threshold.value,
              y1: threshold.value,
              line: {
                color: threshold.color ?? "#ff4444",
                width: 2,
                dash: "dash",
              },
            }] } : {}),
            ...(tickAnnotations.length > 0 || existingAnnotations.length > 0
              ? { annotations: [...tickAnnotations, ...existingAnnotations] }
              : {}),
          }}
          config={{
            displayModeBar: false,
            displaylogo: false,
            staticPlot: false,
          }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
};
