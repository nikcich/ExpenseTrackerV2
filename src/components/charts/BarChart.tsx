import { useMemo, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import sharedStyles from "./ChartPrimitives.module.scss";
import styles from "./BarChart.module.scss";
import { ChartShell, ValueAxis, type LegendEntry, type Margin } from "./ChartPrimitives";
import { catBandTick } from "./chartScaleUtils";
import { ChartOpenPayload } from "./StackedBarChart";
import { formatTooltipMoney, TooltipTitle, TooltipRow } from "./ChartTooltip";

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
  tooltipValueFormat?: (value: number) => string;
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
  tooltipValueFormat = formatTooltipMoney,
}: BarChartProps<T>) => {
  const margin: Margin = useMemo(() => {
    if (horizontal) {
      const maxLabelLen = Math.max(1, ...x.map((d) => String(d).length));
      return {
        top: 22,
        right: 30,
        bottom: 30,
        left: Math.min(140, Math.max(24, maxLabelLen * 7.5 + 12)),
      };
    }
    return {
      top: 10,
      right: 20,
      bottom: 60,
      left: 45,
    };
  }, [horizontal, x]);

  const allValues = useMemo(() => barCharts.flatMap((c) => c.y), [barCharts]);

  const legendItems: LegendEntry[] = useMemo(
    () => barCharts.map((c) => ({ name: c.name, color: c.color })),
    [barCharts]
  );

  return (
    <ChartShell
      legend={legend}
      legendDirection={legendDirection}
      legendItems={legendItems}
      margin={margin}
      hasData={barCharts.length > 0 && x.length > 0}
    >
      {({ innerWidth, innerHeight, margin: m, show, hide }) => (
        <Graph
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          margin={m}
          x={x}
          barCharts={barCharts}
          horizontal={horizontal}
          threshold={threshold}
          xTickColors={xTickColors}
          allValues={allValues}
          onOpen={onOpen}
          onShow={show}
          onHide={hide}
          tooltipValueFormat={tooltipValueFormat}
        />
      )}
    </ChartShell>
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
  tooltipValueFormat,
}: {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
  x: T[];
  barCharts: BarChartItem[];
  horizontal: boolean;
  threshold?: { value: number; label?: string; color?: string };
  xTickColors?: string[];
  allValues: number[];
  onOpen?: (payload: ChartOpenPayload) => void;
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
  tooltipValueFormat: (value: number) => string;
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

  const yTicks = useMemo(() => valScale.ticks(5), [valScale]);
  const xTicks = useMemo(
    () => catScale.domain().filter((_, i) => (horizontal ? true : catBandTick(i, catLabels.length))),
    [catScale, horizontal, catLabels.length]
  );

  return (
    <>
      <ValueAxis
        ticks={yTicks}
        valScale={valScale}
        plotX={plotX}
        plotY={plotY}
        plotW={plotW}
        plotH={plotH}
        horizontal={horizontal}
      />

      {xTicks.map((label) => {
        const idx = catLabels.indexOf(label);
        if (horizontal) {
          const cy = plotY + (catScale(label) ?? 0) + catScale.bandwidth() / 2;
          return (
            <text
              key={label}
              className={sharedStyles.axisText}
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
            className={sharedStyles.axisText}
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
                      value={tooltipValueFormat(value)}
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
                  stroke={threshold.color ?? "var(--error)"}
                  strokeWidth={2}
                />
                {threshold.label && (
                  <text
                    className={styles.thresholdLabel}
                    x={tx + 4}
                    y={plotY + 14}
                    fill={threshold.color ?? "var(--error)"}
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
                  stroke={threshold.color ?? "var(--error)"}
                  strokeWidth={2}
                />
                {threshold.label && (
                  <text
                    className={styles.thresholdLabel}
                    x={plotX + plotW - 4}
                    y={ty - 8}
                    textAnchor="end"
                    fill={threshold.color ?? "var(--error)"}
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
