import { memo, useMemo, useState, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import sharedStyles from "./ChartPrimitives.module.scss";
import styles from "./StackedBarChart.module.scss";
import { ChartShell, ValueAxis, type LegendEntry, type Margin } from "./ChartPrimitives";
import { catBandTick } from "./chartScaleUtils";
import { chartDateCompare } from "@/utils/utils";
import { colorForName } from "@/utils/colors";
import { ChartOpenPayload } from "@/utils/custom-filter";
import { formatTooltipMoney, TooltipTitle, TooltipRow } from "./ChartTooltip";

type Datum = string | number | Date | null;

type Data = {
  x: Datum[];
  y: Datum[];
  name: string;
  type: "bar";
};

export type { ChartOpenPayload };

export const parseStackedFormat = (
  data: {
    group: string;
    total: number;
  }[]
): Data[] => {
  const parsedData = data.map((e) => {
    const [category, group] = e.group.split(" > ");
    return { category, group, total: e.total };
  });

  parsedData.sort((a, b) => chartDateCompare(a.group, b.group));

  const categories = Array.from(new Set(parsedData.map((d) => d.category)));
  const groups = Array.from(new Set(parsedData.map((d) => d.group)));

  const traces: Data[] = categories.map((cat) => ({
    x: groups,
    y: groups.map((g) => {
      const item = parsedData.find((d) => d.category === cat && d.group === g);
      return item ? (item.total < 0 ? 0 : item.total) : 0;
    }),
    name: cat,
    type: "bar",
  }));

  return traces;
};

export const StackedBarChart = memo(function StackedBarChart({
  data,
  legend = true,
  legendDirection = "v",
  legendAlign = "center",
  onOpen,
  tooltipValueFormat = formatTooltipMoney,
  axisValueFormat,
}: {
  data: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
  legendAlign?: "start" | "center";
  onOpen?: (payload: ChartOpenPayload) => void;
  tooltipValueFormat?: (value: number) => string;
  axisValueFormat?: (value: number) => string;
}) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  const toggleDisabled = (name: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visibleData = useMemo(() => data.filter((d) => !disabled.has(d.name)), [data, disabled]);

  const margin: Margin = { top: 15, right: 20, bottom: 60, left: 45 };

  const periods = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const tr of data) {
      for (const xv of tr.x) {
        const key = String(xv);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(key);
        }
      }
    }
    return out;
  }, [data]);

  const traceColors = useMemo(() => data.map((d) => colorForName(d.name)), [data]);

  const legendItems: LegendEntry[] = useMemo(
    () =>
      data.map((c, i) => ({
        name: c.name,
        color: traceColors[i],
        dimmed: disabled.has(c.name),
        onToggle: () => toggleDisabled(c.name),
      })),
    [data, traceColors, disabled]
  );

  return (
    <ChartShell
      legend={legend}
      legendDirection={legendDirection}
      legendItems={legendItems}
      legendAlign={legendAlign}
      margin={margin}
      hasData={visibleData.length > 0}
    >
      {({ innerWidth, innerHeight, margin: m, show, hide }) => (
        <Graph
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          margin={m}
          periods={periods}
          data={visibleData}
          onOpen={onOpen}
          onShow={show}
          onHide={hide}
          tooltipValueFormat={tooltipValueFormat}
          axisValueFormat={axisValueFormat}
        />
      )}
    </ChartShell>
  );
});

function Graph({
  innerWidth,
  innerHeight,
  margin,
  periods,
  data,
  onOpen,
  onShow,
  onHide,
  tooltipValueFormat,
  axisValueFormat,
}: {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
  periods: string[];
  data: Data[];
  onOpen?: (payload: ChartOpenPayload) => void;
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
  tooltipValueFormat: (value: number) => string;
  axisValueFormat?: (value: number) => string;
}) {
  const plotX = margin.left;
  const plotY = margin.top;
  const plotW = innerWidth;
  const plotH = innerHeight;

  const catScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(periods)
        .range([0, plotW])
        .paddingInner(0.25)
        .paddingOuter(0.15),
    [periods, plotW]
  );

  const stacks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < periods.length; i++) {
      let sum = 0;
      for (const tr of data) {
        sum += Number(tr.y[i]) || 0;
      }
      out.push(sum);
    }
    return out;
  }, [periods, data]);

  const maxStack = Math.max(1, ...stacks);
  const valScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxStack])
        .nice()
        .range([plotY + plotH, plotY]),
    [maxStack, plotY, plotH]
  );

  const yTicks = useMemo(() => valScale.ticks(5), [valScale]);
  const xTicks = useMemo(
    () => catScale.domain().filter((_, i) => catBandTick(i, periods.length)),
    [catScale, periods.length]
  );

  const bandWidth = catScale.bandwidth();
  const barWidth = Math.max(1, bandWidth);

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
        const cy = plotY + plotH;
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

      {periods.map((period, i) => {
        const segments = data
          .map((tr) => ({
            name: tr.name,
            value: Number(tr.y[i]) || 0,
          }))
          .filter((s) => s.value > 0)
          .sort((a, b) => b.value - a.value);

        let cum = 0;
        const cx = plotX + (catScale(period) ?? 0);
        return segments.map((seg) => {
          const startPx = valScale(cum);
          cum += seg.value;
          const endPx = valScale(cum);
          const color = colorForName(seg.name);
          return (
            <rect
              key={`${seg.name}-${period}`}
              className={styles.segment}
              x={cx}
              y={endPx}
              width={barWidth}
              height={startPx - endPx}
              fill={color}
              onMouseMove={(e) =>
                onShow(e.clientX, e.clientY, (
                  <>
                    <TooltipTitle>{period}</TooltipTitle>
                    <TooltipRow
                      color={color}
                      label={seg.name}
                      value={tooltipValueFormat(seg.value)}
                    />
                  </>
                ))
              }
              onMouseLeave={onHide}
              onDoubleClick={() =>
                onOpen?.({
                  category: seg.name,
                  period: String(period),
                })
              }
            />
          );
        });
      })}
    </>
  );
}
