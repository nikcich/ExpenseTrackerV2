import { memo, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import styles from "./StackedBarChart.module.scss";
import { chartDateCompare } from "@/utils/utils";
import { colorForName } from "@/utils/colors";
import { ChartOpenPayload } from "@/utils/custom-filter";
import {
  useChartTooltip,
  ChartTooltip,
  formatTooltipMoney,
  TooltipTitle,
  TooltipRow,
} from "./ChartTooltip";

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
  onOpen,
}: {
  data: Data[];
  legend?: boolean;
  legendDirection?: "v" | "h";
  onOpen?: (payload: ChartOpenPayload) => void;
}) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const { containerRef, tip, show, hide } = useChartTooltip();

  const toggleDisabled = (name: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visibleData = useMemo(() => data.filter((d) => !disabled.has(d.name)), [data, disabled]);

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

  const margin = { top: 15, right: 20, bottom: 60, left: 45 };

  const { width, height } = size;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

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

  const traceColors = useMemo(
    () => data.map((d) => colorForName(d.name)),
    [data]
  );

  return (
    <div className={styles.container}>
      {legend && legendDirection === "h" && (
        <div className={styles.legendRow}>
          {data.map((c, i) => {
            const dimmed = disabled.has(c.name);
            return (
              <span
                key={c.name}
                className={styles.legendItem}
                onClick={() => toggleDisabled(c.name)}
                style={{ opacity: dimmed ? 0.35 : 1, cursor: "pointer" }}
              >
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: traceColors[i] }}
                />
                {c.name}
              </span>
            );
          })}
        </div>
      )}
      <div className={styles.bodyRow}>
        <div className={styles.plotContainer} ref={(el) => { plotRef.current = el; containerRef.current = el; }}>
          {innerWidth > 0 && innerHeight > 0 && visibleData.length > 0 && (
            <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`}>
              <Graph
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                margin={margin}
                periods={periods}
                data={visibleData}
                onOpen={onOpen}
                onShow={show}
                onHide={hide}
              />
            </svg>
          )}
          <ChartTooltip tip={tip} />
        </div>
        {legend && legendDirection === "v" && (
          <div className={styles.legendCol}>
            {data.map((c, i) => {
              const dimmed = disabled.has(c.name);
              return (
                <span
                  key={c.name}
                  className={styles.legendItem}
                  onClick={() => toggleDisabled(c.name)}
                  style={{ opacity: dimmed ? 0.35 : 1, cursor: "pointer" }}
                >
                  <span
                    className={styles.legendSwatch}
                    style={{ backgroundColor: traceColors[i] }}
                  />
                  {c.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
}: {
  innerWidth: number;
  innerHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  periods: string[];
  data: Data[];
  onOpen?: (payload: ChartOpenPayload) => void;
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
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
        const cy = plotY + plotH;
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
                      value={formatTooltipMoney(seg.value)}
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
