import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { formatMonthShort } from "@/utils/utils";
import styles from "./Overview.module.scss";

export function NetSparkline({
  data,
  months,
  selectedIndex,
  formatLabel,
}: {
  data: number[];
  months: Date[];
  selectedIndex: number;
  formatLabel?: (date: Date) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 60;
  const xPad = 15;
  const pad = { top: 2, right: 2, bottom: 14, left: 2 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const xScale = d3
    .scalePoint<number>()
    .domain(data.map((_, i) => i))
    .range([xPad, innerW - xPad]);

  const yMin = Math.min(0, ...data);
  const yMax = Math.max(0, ...data);
  const yRange = yMax - yMin || 1;
  const yScale = d3
    .scaleLinear()
    .domain([yMin - yRange * 0.1, yMax + yRange * 0.1])
    .range([innerH, 0]);

  const allZero = data.every((d) => d === 0);

  const fmt = formatLabel ?? formatMonthShort;

  if (allZero) {
    return (
      <div className={styles.sparkline} ref={containerRef}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={styles.sparklineSvg}
          preserveAspectRatio="none"
        >
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fill="var(--fg-subtle, #6b6b7b)"
            fontSize="11"
          >
            No data
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={styles.sparkline} ref={containerRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.sparklineSvg}
        preserveAspectRatio="none"
      >
        <g transform={`translate(${pad.left},${pad.top})`}>
          {data.slice(0, -1).map((_, i) => {
            const color =
              data[i + 1] >= 0
                ? "var(--fg-success, #4ade80)"
                : "var(--fg-error, #f87171)";
            const area = `M${xScale(i)!},${yScale(0)}L${xScale(i)!},${yScale(data[i])}L${xScale(i + 1)!},${yScale(data[i + 1])}L${xScale(i + 1)!},${yScale(0)}Z`;
            const line = `M${xScale(i)!},${yScale(data[i])}L${xScale(i + 1)!},${yScale(data[i + 1])}`;
            return (
              <g key={i}>
                <path d={area} fill={color} opacity={0.12} />
                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={xScale(i)!}
              cy={yScale(d)}
              r={i === selectedIndex ? 5 : 2}
              fill={
                d >= 0
                  ? "var(--fg-success, #4ade80)"
                  : "var(--fg-error, #f87171)"
              }
            />
          ))}
          {months.map((m, i) => (
            <text
              key={i}
              x={xScale(i)!}
              y={innerH + 12}
              textAnchor="middle"
              fill="var(--fg-subtle, #6b6b7b)"
              fontSize="8"
            >
              {fmt(m)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
