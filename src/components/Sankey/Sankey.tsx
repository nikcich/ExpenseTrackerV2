type SankeyNode = {
  id: string;
  label: string;
  color?: string;
};

type SankeyLink = {
  source: string; // node id
  target: string; // node id
  value: number;
  color?: string;
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

import Plot from "react-plotly.js";
import styles from "./Sankey.module.scss";

type SankeyProps = {
  data: SankeyData;
};

export const Sankey = ({ data }: SankeyProps) => {
  // Build node index map
  const nodeIndex = new Map<string, number>();
  data.nodes.forEach((node, i) => nodeIndex.set(node.id, i));
  return (
    <div className={styles.container}>
      <div className={styles.plotContainer}>
        <Plot
          data={[
            {
              type: "sankey",
              orientation: "h",
              node: {
                pad: 20,
                thickness: 20,
                label: data.nodes.map((n) => n.label),
                color: data.nodes.map((n) => n.color ?? "#ccc"),
              },
              link: {
                source: data.links.map((l) => nodeIndex.get(l.source)!),
                target: data.links.map((l) => nodeIndex.get(l.target)!),
                value: data.links.map((l) => l.value),
                color: data.links.map(
                  (l) => l.color ?? "rgba(255,255,255,0.2)"
                ),
                customdata: data.links.map((l) => l.value),
                hoverinfo: "none",
              },
            },
          ]}
          layout={{
            autosize: true,
            margin: {
              t: 40,
              r: 20,
              l: 40,
              b: 30,
            },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
              color: "#ffffff",
            },
            dragmode: false,
            showlegend: false,
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
