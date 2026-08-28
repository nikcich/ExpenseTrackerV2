import { memo, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import {
  line as d3line,
  curveLinear,
  curveStep,
  curveStepAfter,
  curveStepBefore,
} from "d3-shape";
import styles from "./LineChart.module.scss";
import {
  useChartTooltip,
  ChartTooltip,
  formatTooltipMoney,
  TooltipTitle,
  TooltipRow,
} from "./ChartTooltip";

type Datum = string | number | Date | null;

interface LineChartProps<T extends Datum> {
  x: T[];
  barCharts: LineChartItem[];
  horizontal?: boolean;
  legend?: boolean;
  legendDirection?: "v" | "h";
  lineShape?: "linear" | "hv" | "vh" | "hvh" | "vhv";
}

interface LineChartItem {
  name: string;
  y: (number | null)[];
  color: string;
}

export const LineChart = memo(function LineChart<T extends Datum>({
  x,
  barCharts,
  horizontal = false,
  legend = true,
  legendDirection = "v",
  lineShape = "linear",
}: LineChartProps<T>) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { containerRef, tip, show, hide } = useChartTooltip();

  useLayoutEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const margin = {
    top: 20,
    right: 20,
    bottom: legend ? 55 : 40,
    left: 45,
  };

  const { width, height } = size;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  return (
    <div className={styles.container}>
      {legend && legendDirection === "h" && (
        <div className={styles.legendRow}>
          {barCharts.map((c) => (
            <span key={c.name} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </span>
          ))}
        </div>
      )}
      <div className={styles.bodyRow}>
        <div className={styles.plotContainer} ref={(el) => { plotRef.current = el; containerRef.current = el; }}>
          {innerWidth > 0 && innerHeight > 0 && barCharts.length > 0 && (
            <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`}>
              <Graph
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                margin={margin}
                x={x}
                data={barCharts}
                horizontal={horizontal}
                lineShape={lineShape}
                onShow={show}
                onHide={hide}
              />
            </svg>
          )}
          <ChartTooltip tip={tip} />
        </div>
        {legend && legendDirection === "v" && (
          <div className={styles.legendCol}>
            {barCharts.map((c) => (
              <span key={c.name} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function Graph<T extends Datum>({
  innerWidth,
  innerHeight,
  margin,
  x,
  data,
  horizontal,
  lineShape,
  onShow,
  onHide,
}: {
  innerWidth: number;
  innerHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  x: T[];
  data: LineChartItem[];
  horizontal: boolean;
  lineShape: "linear" | "hv" | "vh" | "hvh" | "vhv";
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
}) {
  const plotX = margin.left;
  const plotY = margin.top;
  const plotW = innerWidth;
  const plotH = innerHeight;

  const labels = x.map((d) => String(d));

  const catScale = useMemo(
    () => scaleBand<string>().domain(labels).range([0, plotW]).padding(0.3),
    [labels, plotW]
  );

  const allValues = useMemo(
    () => data.flatMap((c) => c.y.filter((v): v is number => v != null)),
    [data]
  );
  const maxVal = Math.max(0, ...allValues);
  const valScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxVal])
        .nice()
        .range([plotY + plotH, plotY]),
    [maxVal, plotY, plotH]
  );

  const curve = useMemo(() => {
    switch (lineShape) {
      case "hv":
        return curveStepAfter;
      case "vh":
        return curveStepBefore;
      case "hvh":
      case "vhv":
        return curveStep;
      default:
        return curveLinear;
    }
  }, [lineShape]);

  const lineGen = useMemo(
    () =>
      d3line<number | null>()
        .defined((v) => v != null)
        .x((_, i) => plotX + (catScale(labels[i]) ?? 0) + catScale.bandwidth() / 2)
        .y((v) => valScale(v as number))
        .curve(curve),
    [catScale, labels, plotX, valScale, curve]
  );

  const yTicks = useMemo(() => valScale.ticks(5), [valScale]);
  const xTicks = useMemo(
    () => catScale.domain().filter((_, i) => catBandTick(i, labels.length)),
    [catScale, labels.length]
  );

  return (
    <>
      {yTicks.map((t) => {
        const ty = valScale(t);
        return (
          <g key={t}>
            <line
              className={styles.gridLine}
              x1={plotX}
              y1={ty}
              x2={plotX + plotW}
              y2={ty}
            />
            <text
              className={styles.axisText}
              x={plotX - 8}
              y={ty + 3}
              textAnchor="end"
            >
              {valFormat(t)}
            </text>
          </g>
        );
      })}

      {xTicks.map((label) => {
        const cx = plotX + (catScale(label) ?? 0) + catScale.bandwidth() / 2;
        if (horizontal) {
          const cy = plotY + (catScale(label) ?? 0) + catScale.bandwidth() / 2;
          return (
            <text
              key={label}
              className={styles.axisText}
              x={plotX - 8}
              y={cy + 3}
              textAnchor="end"
            >
              {label}
            </text>
          );
        }
        const cy = plotY + plotH;
        return (
          <text
            key={label}
            className={styles.axisText}
            x={cx}
            y={cy + 24}
            textAnchor="middle"
            transform={`rotate(-20 ${cx} ${cy + 24})`}
          >
            {label}
          </text>
        );
      })}

      {data.map((series) => {
        const path = lineGen(series.y);
        return (
          <path
            key={series.name}
            d={path ?? ""}
            fill="none"
            stroke={series.color}
            strokeWidth={3}
          />
        );
      })}

      {data.map((series) =>
        series.y
          .map((value, i): { value: number; i: number } | null =>
            value == null ? null : { value, i }
          )
          .filter((d): d is { value: number; i: number } => d != null)
          .map(({ value, i }) => {
            const cx =
              plotX + (catScale(labels[i]) ?? 0) + catScale.bandwidth() / 2;
            const cy = valScale(value);
            return (
              <circle
                key={`${series.name}-${labels[i]}`}
                cx={cx}
                cy={cy}
                r={10}
                fill="transparent"
                onMouseMove={(e) =>
                  onShow(e.clientX, e.clientY, (
                    <>
                      <TooltipTitle>{String(x[i])}</TooltipTitle>
                      <TooltipRow
                        color={series.color}
                        label={series.name}
                        value={formatTooltipMoney(value)}
                      />
                    </>
                  ))
                }
                onMouseLeave={onHide}
              />
            );
          })
      )}
    </>
  );
}

function catBandTick(i: number, total: number): boolean {
  if (total <= 14) return true;
  const step = Math.ceil(total / 14);
  return i % step === 0;
}

function valFormat(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  if (abs >= 100) return `${Math.round(v)}`;
  return `${Math.round(v * 10) / 10}`;
}
