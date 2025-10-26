import Plot from "react-plotly.js";
import styles from "./BarChart.module.scss";

type Datum = string | number | Date | null;

interface BarChartProps<T extends Datum, K extends Datum> {
  x: T[];
  y: K[];
}

export const BarChart = <T extends Datum, K extends Datum>({
  x,
  y,
}: BarChartProps<T, K>) => {
  return (
    <div className={styles.container}>
      <div className={styles.plotContainer}>
        <Plot
          data={[
            {
              x,
              y,
              type: "bar",
              marker: { color: "#1f77b4" },
            },
          ]}
          layout={{
            autosize: true,
            margin: { t: 40, r: 20, l: 40, b: 40 },
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
