import { useRef, type ReactNode } from "react";
import cx from "classnames";
import styles from "./ChartPrimitives.module.scss";
import { useElementSize } from "@/hooks/useElementSize";
import { useChartTooltip, ChartTooltip } from "./ChartTooltip";
import { valFormat } from "./chartScaleUtils";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LegendEntry {
  name: string;
  color: string;
  dimmed?: boolean;
  onToggle?: () => void;
}

type TooltipShow = (clientX: number, clientY: number, content: ReactNode) => void;

interface GraphContext {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
  show: TooltipShow;
  hide: () => void;
}

function Legend({
  items,
  direction,
  swatch,
  align = "center",
}: {
  items: LegendEntry[];
  direction: "v" | "h";
  swatch: "square" | "line";
  align?: "start" | "center";
}) {
  return (
    <div
      className={cx(
        direction === "h" ? styles.legendRow : styles.legendCol,
        direction === "h" && align === "start" && styles.legendRowStart
      )}
    >
      {items.map((item) => (
        <span
          key={item.name}
          className={cx(styles.legendItem, item.onToggle && styles.legendItemInteractive)}
          style={item.dimmed ? { opacity: 0.35 } : undefined}
          onClick={item.onToggle}
        >
          <span
            className={swatch === "line" ? styles.legendSwatchLine : styles.legendSwatch}
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}

export function ChartShell({
  legend = true,
  legendDirection = "v",
  legendItems,
  legendSwatch = "square",
  legendAlign = "center",
  margin,
  hasData,
  children,
}: {
  legend?: boolean;
  legendDirection?: "v" | "h";
  legendItems: LegendEntry[];
  legendSwatch?: "square" | "line";
  legendAlign?: "start" | "center";
  margin: Margin;
  hasData: boolean;
  children: (ctx: GraphContext) => ReactNode;
}) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const size = useElementSize(plotRef);
  const { containerRef, tip, show, hide } = useChartTooltip();

  const { width, height } = size;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  return (
    <div className={styles.container}>
      {legend && legendDirection === "h" && (
        <Legend items={legendItems} direction="h" swatch={legendSwatch} align={legendAlign} />
      )}
      <div className={styles.bodyRow}>
        <div
          className={styles.plotContainer}
          ref={(el) => {
            plotRef.current = el;
            containerRef.current = el;
          }}
        >
          {innerWidth > 0 && innerHeight > 0 && hasData && (
            <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`}>
              {children({ width, height, innerWidth, innerHeight, margin, show, hide })}
            </svg>
          )}
          <ChartTooltip tip={tip} />
        </div>
        {legend && legendDirection === "v" && (
          <Legend items={legendItems} direction="v" swatch={legendSwatch} />
        )}
      </div>
    </div>
  );
}

export function ValueAxis({
  ticks,
  valScale,
  plotX,
  plotY,
  plotW,
  plotH,
  horizontal = false,
  format = valFormat,
}: {
  ticks: number[];
  valScale: (v: number) => number;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  horizontal?: boolean;
  format?: (value: number) => string;
}) {
  return (
    <>
      {ticks.map((t) => {
        if (horizontal) {
          const tx = valScale(t);
          return (
            <g key={t}>
              <line className={styles.gridLine} x1={tx} y1={plotY} x2={tx} y2={plotY + plotH} />
              <text className={styles.axisText} x={tx} y={plotY + 2} textAnchor="middle">
                {format(t)}
              </text>
            </g>
          );
        }
        const ty = valScale(t);
        return (
          <g key={t}>
            <line className={styles.gridLine} x1={plotX} y1={ty} x2={plotX + plotW} y2={ty} />
            <text className={styles.axisText} x={plotX - 8} y={ty + 3} textAnchor="end">
              {format(t)}
            </text>
          </g>
        );
      })}
    </>
  );
}
