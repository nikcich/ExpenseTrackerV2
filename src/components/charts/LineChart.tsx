import { memo, useMemo, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import {
  line as d3line,
  curveLinear,
  curveStep,
  curveStepAfter,
  curveStepBefore,
} from "d3-shape";
import styles from "./ChartPrimitives.module.scss";
import { ChartShell, ValueAxis, type LegendEntry, type Margin } from "./ChartPrimitives";
import { catBandTick } from "./chartScaleUtils";
import { formatTooltipMoney, TooltipTitle, TooltipRow } from "./ChartTooltip";

type Datum = string | number | Date | null;

interface LineChartProps<T extends Datum> {
  x: T[];
  barCharts: LineChartItem[];
  horizontal?: boolean;
  legend?: boolean;
  legendDirection?: "v" | "h";
  legendAlign?: "start" | "center";
  lineShape?: "linear" | "hv" | "vh" | "hvh" | "vhv";
  tooltipValueFormat?: (value: number) => string;
  axisValueFormat?: (value: number) => string;
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
  legendAlign = "center",
  lineShape = "linear",
  tooltipValueFormat = formatTooltipMoney,
  axisValueFormat,
}: LineChartProps<T>) {
  const margin: Margin = {
    top: 20,
    right: 20,
    bottom: legend ? 55 : 40,
    left: 45,
  };

  const legendItems: LegendEntry[] = useMemo(
    () => barCharts.map((c) => ({ name: c.name, color: c.color })),
    [barCharts]
  );

  return (
    <ChartShell
      legend={legend}
      legendDirection={legendDirection}
      legendItems={legendItems}
      legendSwatch="line"
      legendAlign={legendAlign}
      margin={margin}
      hasData={barCharts.length > 0}
    >
      {({ innerWidth, innerHeight, margin: m, show, hide }) => (
        <Graph
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          margin={m}
          x={x}
          data={barCharts}
          horizontal={horizontal}
          lineShape={lineShape}
          onShow={show}
          onHide={hide}
          tooltipValueFormat={tooltipValueFormat}
          axisValueFormat={axisValueFormat}
        />
      )}
    </ChartShell>
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
  tooltipValueFormat,
  axisValueFormat,
}: {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
  x: T[];
  data: LineChartItem[];
  horizontal: boolean;
  lineShape: "linear" | "hv" | "vh" | "hvh" | "vhv";
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
  tooltipValueFormat: (value: number) => string;
  axisValueFormat?: (value: number) => string;
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
      <ValueAxis
        ticks={yTicks}
        valScale={valScale}
        plotX={plotX}
        plotY={plotY}
        plotW={plotW}
        plotH={plotH}
        format={axisValueFormat}
      />

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
                        value={tooltipValueFormat(value)}
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
