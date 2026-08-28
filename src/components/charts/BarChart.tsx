import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import styles from "./BarChart.module.scss";
import { ChartOpenPayload } from "./StackedBarChart";
import {
  useChartTooltip,
  ChartTooltip,
  formatTooltipMoney,
  TooltipTitle,
  TooltipRow,
} from "./ChartTooltip";

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
  onOpen?: (payload: ChartOpenPayload) => void;
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
  onOpen,
}: BarChartProps<T>) => {
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

  const margin = useMemo(() => {
    if (horizontal) {
      return {
        top: 22,
        right: 30,
        bottom: 30,
        left: legend ? 90 : 60,
      };
    }
    return {
      top: 10,
      right: 20,
      bottom: 60,
      left: 45,
    };
  }, [horizontal, legend]);

  const { width, height } = size;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const allValues = useMemo(
    () => barCharts.flatMap((c) => c.y),
    [barCharts]
  );

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
          {innerWidth > 0 && innerHeight > 0 && (
            <svg
              className={styles.svg}
              viewBox={`0 0 ${width} ${height}`}
            >
              {barCharts.length > 0 && x.length > 0 && (
                <Graph
                  innerWidth={innerWidth}
                  innerHeight={innerHeight}
                  margin={margin}
                  x={x}
                  barCharts={barCharts}
                  horizontal={horizontal}
                  threshold={threshold}
                  xTickColors={xTickColors}
                  allValues={allValues}
                  onOpen={onOpen}
                  onShow={show}
                  onHide={hide}
                />
              )}
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
};

function Graph<T extends Datum>({
  innerWidth,
  innerHeight,
  margin,
  x,
  barCharts,
  horizontal,
  threshold,
  xTickColors,
  allValues,
  onOpen,
  onShow,
  onHide,
}: {
  innerWidth: number;
  innerHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  x: T[];
  barCharts: BarChartItem[];
  horizontal: boolean;
  threshold?: { value: number; label?: string; color?: string };
  xTickColors?: string[];
  allValues: number[];
  onOpen?: (payload: ChartOpenPayload) => void;
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
}) {
  const plotX = margin.left;
  const plotY = margin.top;
  const plotW = innerWidth;
  const plotH = innerHeight;

  const catLabels = x.map((d) => String(d));
  const catScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(catLabels)
        .range([0, horizontal ? plotH : plotW])
        .paddingInner(0.25)
        .paddingOuter(0.15),
    [catLabels, horizontal, plotH, plotW]
  );

  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(0, ...allValues);
  const valScale = useMemo(
    () =>
      scaleLinear()
        .domain([minVal, maxVal])
        .nice()
        .range(horizontal ? [plotX, plotX + plotW] : [plotY + plotH, plotY]),
    [minVal, maxVal, horizontal, plotX, plotW, plotY, plotH]
  );

  const zeroPx = valScale(0);

  const bandWidth = catScale.bandwidth();
  const groupPad = bandWidth * 0.08;
  const barWidth = Math.max(
    1,
    (bandWidth - groupPad * (barCharts.length - 1)) / barCharts.length
  );

  const yTicks = useMemo(() => valScale.ticks(horizontal ? 5 : 5), [valScale, horizontal]);
  const xTicks = useMemo(
    () => catScale.domain().filter((_, i) => (horizontal ? true : catBandTick(i, catLabels.length))),
    [catScale, horizontal, catLabels.length]
  );

  return (
    <>
      {yTicks.map((t) => {
        const ty = horizontal
          ? plotY
          : valScale(t);
        const tx = horizontal ? valScale(t) : plotX;
        if (horizontal) {
          return (
            <g key={t}>
              <line
                className={styles.gridLine}
                x1={tx}
                y1={plotY}
                x2={tx}
                y2={plotY + plotH}
              />
              <text
                className={styles.axisText}
                x={tx}
                y={plotY + 2}
                textAnchor="middle"
              >
                {valFormat(t)}
              </text>
            </g>
          );
        }
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
        const idx = catLabels.indexOf(label);
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
        const color = xTickColors?.[idx];
        const cx = plotX + (catScale(label) ?? 0) + catScale.bandwidth() / 2;
        const cy = plotY + plotH;
        if (xTickColors) {
          return (
            <text
              key={label}
              x={cx}
              y={cy + 15}
              textAnchor="middle"
              fill={color}
              fontSize={10}
              transform={`rotate(-20 ${cx} ${cy + 15})`}
            >
              {label}
            </text>
          );
        }
        return (
          <text
            key={label}
            className={styles.axisText}
            x={cx}
            y={cy + 17}
            textAnchor="middle"
            transform={`rotate(-20 ${cx} ${cy + 17})`}
          >
            {label}
          </text>
        );
      })}

      {barCharts.map((chart, s) =>
        catLabels.map((label, i) => {
          const value = Number(chart.y[i]) || 0;
          const start = (labelIndex: string) =>
            (catScale(labelIndex) ?? 0) + groupPad + s * (barWidth + groupPad);
          let px: number;
          let py: number;
          let pw: number;
          let ph: number;
          if (horizontal) {
            const cy = plotY + start(label);
            const len = Math.abs(valScale(value) - zeroPx);
            px = valScale(Math.min(0, value));
            py = cy;
            pw = len;
            ph = barWidth;
          } else {
            const cx = plotX + start(label);
            const len = Math.abs(valScale(value) - zeroPx);
            px = cx;
            py = valScale(Math.max(0, value));
            pw = barWidth;
            ph = len;
          }
          return (
            <rect
              key={`${chart.name}-${label}`}
              className={styles.bar}
              x={px}
              y={py}
              width={Math.max(0, pw)}
              height={Math.max(0, ph)}
              rx={2}
              fill={chart.color}
              onMouseMove={(e) =>
                onShow(e.clientX, e.clientY, (
                  <>
                    <TooltipTitle>{String(x[i])}</TooltipTitle>
                    <TooltipRow
                      color={chart.color}
                      label={chart.name}
                      value={formatTooltipMoney(value)}
                    />
                  </>
                ))
              }
              onMouseLeave={onHide}
              onDoubleClick={() =>
                onOpen?.({
                  category: chart.name,
                  period: String(x[i]),
                })
              }
            />
          );
        })
      )}

      {threshold &&
        (horizontal ? (
          (() => {
            const tx = valScale(threshold.value);
            return (
              <g>
                <line
                  className={styles.thresholdLine}
                  x1={tx}
                  y1={plotY}
                  x2={tx}
                  y2={plotY + plotH}
                  stroke={threshold.color ?? "#ff4444"}
                  strokeWidth={2}
                />
                {threshold.label && (
                  <text
                    className={styles.thresholdLabel}
                    x={tx + 4}
                    y={plotY + 14}
                    fill={threshold.color ?? "#ff4444"}
                  >
                    {threshold.label}
                  </text>
                )}
              </g>
            );
          })()
        ) : (
          (() => {
            const ty = valScale(threshold.value);
            return (
              <g>
                <line
                  className={styles.thresholdLine}
                  x1={plotX}
                  y1={ty}
                  x2={plotX + plotW}
                  y2={ty}
                  stroke={threshold.color ?? "#ff4444"}
                  strokeWidth={2}
                />
                {threshold.label && (
                  <text
                    className={styles.thresholdLabel}
                    x={plotX + plotW - 4}
                    y={ty - 8}
                    textAnchor="end"
                    fill={threshold.color ?? "#ff4444"}
                  >
                    {threshold.label}
                  </text>
                )}
              </g>
            );
          })()
        ))}
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
