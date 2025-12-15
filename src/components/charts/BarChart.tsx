import Plot from "react-plotly.js";
import styles from "./BarChart.module.scss";

type Datum = string | number | Date | null;

interface BarChartProps<T extends Datum> {
  x: T[];
  barCharts: BarChartItem[];
  horizontal?: boolean;
  legend?: boolean;
  legendDirection?: "v" | "h";
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
}: BarChartProps<T>) => {
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
              b: horizontal ? 25 : legend ? 40 : 80,
            },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: "#ffffff",
            },
            dragmode: false,
            showlegend: legend,
            legend: { orientation: legendDirection },
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
