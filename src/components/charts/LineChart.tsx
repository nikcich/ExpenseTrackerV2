import Plot from "react-plotly.js";
import styles from "./BarChart.module.scss";

type Datum = string | number | Date | null;

interface LineChartProps<T extends Datum> {
  x: T[];
  barCharts: LineChartItem[];
  horizontal?: boolean;
  legend?: boolean;
  legendDirection?: "v" | "h";
}

interface LineChartItem {
  name: string;
  y: number[];
  color: string;
}

export const LineChart = <T extends Datum>({
  x,
  barCharts,
  horizontal = false,
  legend = true,
  legendDirection = "v",
}: LineChartProps<T>) => {
  return (
    <div className={styles.container}>
      <div className={styles.plotContainer}>
        <Plot
          data={barCharts.map((chart) => ({
            x: horizontal ? chart.y : x,
            y: horizontal ? x : chart.y,
            name: chart.name,
            orientation: horizontal ? "h" : "v",
            marker: { color: chart.color },
            type: "scatter",
            mode: "lines",
            line: {
              width: 5,
            },
          }))}
          layout={{
            autosize: true,
            margin: {
              t: 40,
              r: 20,
              l: horizontal ? 70 : 40,
              b: legend ? 90 : 30,
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
