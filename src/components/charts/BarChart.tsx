import Plot from "react-plotly.js";
import styles from "./BarChart.module.scss";

type Datum = string | number | Date | null;

interface BarChartProps<T extends Datum> {
  x: T[];
  barCharts: BarChartItem[];
  horizontal?: boolean;
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
            margin: { t: 40, r: 20, l: horizontal ? 70 : 40, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: "#ffffff",
            },
            dragmode: false,
          }}
          config={{
            displayModeBar: false,
            displaylogo: false,
            staticPlot: false,
          }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
};
