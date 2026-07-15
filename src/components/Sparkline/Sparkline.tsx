import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Sparkline.module.scss";

export type SparklineProps = {
  data: { label: string; value: number }[];
  color?: string;
  segmentColors?: { positive: string; negative: string };
  height?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  showArea?: boolean;
  showDots?: boolean;
  dotRadius?: number;
  selectedDotRadius?: number;
  selectedIndex?: number;
  showLabels?: "auto" | "all" | "none";
  labelFontSize?: number;
  labelColor?: string;
  emptyText?: string;
  className?: string;
};

export function Sparkline({
  data,
  color = "var(--fg-info, #60a5fa)",
  segmentColors,
  height = 70,
  padding,
  showArea = true,
  showDots = false,
  dotRadius = 2,
  selectedDotRadius = 5,
  selectedIndex,
  showLabels = "none",
  labelFontSize = 8,
  labelColor = "var(--fg-subtle, #6b6b7b)",
  emptyText = "No data",
  className,
}: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(400);
  const [measuredWidths, setMeasuredWidths] = useState<number[]>([]);

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

  useEffect(() => {
    if (!measureRef.current) return;
    const texts = measureRef.current.querySelectorAll("text");
    const widths = Array.from(texts).map((t) => t.getComputedTextLength());
    setMeasuredWidths(widths);
  }, [data, labelFontSize]);

  const needsLabelPadding = showLabels === "auto" || showLabels === "all";
  const maxLabelWidth = useMemo(
    () => (measuredWidths.length > 0 ? Math.max(...measuredWidths) : 60),
    [measuredWidths],
  );
  const edgePad = needsLabelPadding ? Math.ceil(maxLabelWidth / 2) + 2 : 0;

  const pad =
    padding ??
    (needsLabelPadding
      ? { top: 4, right: 4 + edgePad, bottom: 20, left: 4 + edgePad }
      : { top: 4, right: 4, bottom: 4, left: 4 });
  const innerW = Math.max(width - pad.left - pad.right, 1);
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(0, ...values);
  const yRange = yMax - yMin || 1;

  const xScale = useCallback(
    (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
    [pad.left, data.length, innerW],
  );
  const yScale = useCallback(
    (v: number) => pad.top + innerH - ((v - yMin) / yRange) * innerH,
    [pad.top, innerH, yMin, yRange],
  );

  const pathD = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.value)}`)
    .join("");

  const defaultColor = segmentColors?.positive ?? color;

  const visibleIndices = useMemo(() => {
    if (data.length === 0) return new Set<number>();
    if (showLabels === "none") return new Set<number>();
    if (data.length <= 2) return new Set(data.map((_, i) => i));

    const positions = data.map(
      (_, i) => pad.left + (i / (data.length - 1)) * innerW,
    );
    const minSpacing = maxLabelWidth + 6;

    const indices = new Set<number>();
    indices.add(0);
    let lastX = positions[0];

    for (let i = 1; i < data.length - 1; i++) {
      if (positions[i] - lastX >= minSpacing) {
        indices.add(i);
        lastX = positions[i];
      }
    }

    const lastIdx = data.length - 1;
    const prevIdx = Array.from(indices).pop()!;
    if (prevIdx !== lastIdx && positions[lastIdx] - positions[prevIdx] < minSpacing) {
      indices.delete(prevIdx);
    }
    indices.add(lastIdx);
    return indices;
  }, [data.length, showLabels, maxLabelWidth, innerW, pad.left]);

  const shouldShowLabel = (i: number) => visibleIndices.has(i);

  if (data.length === 0) {
    return (
      <div ref={containerRef} className={className ?? styles.sparkline}>
        <svg width={width} height={height} className={styles.svg}>
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fill={labelColor}
            fontSize={labelFontSize}
          >
            {emptyText}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className ?? styles.sparkline}>
      <svg
        ref={measureRef}
        width={0}
        height={0}
        style={{ position: "absolute", overflow: "hidden" }}
        aria-hidden
      >
        {data.map((d, i) => (
          <text key={i} fontSize={labelFontSize}>
            {d.label}
          </text>
        ))}
      </svg>
      <svg width={width} height={height} className={styles.svg}>
        {segmentColors ? (
          data.slice(0, -1).map((_, i) => {
            const c =
              data[i + 1].value >= 0
                ? segmentColors.positive
                : segmentColors.negative;
            const area = `M${xScale(i)},${yScale(0)}L${xScale(i)},${yScale(data[i].value)}L${xScale(i + 1)},${yScale(data[i + 1].value)}L${xScale(i + 1)},${yScale(0)}Z`;
            const line = `M${xScale(i)},${yScale(data[i].value)}L${xScale(i + 1)},${yScale(data[i + 1].value)}`;
            return (
              <g key={i}>
                {showArea && <path d={area} fill={c} opacity={0.12} />}
                <path
                  d={line}
                  fill="none"
                  stroke={c}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })
        ) : (
          <>
            {showArea && (
              <path
                d={`${pathD}L${xScale(data.length - 1)},${yScale(0)}L${xScale(0)},${yScale(0)}Z`}
                fill={defaultColor}
                opacity={0.1}
              />
            )}
            <path
              d={pathD}
              fill="none"
              stroke={defaultColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {showDots &&
          data.map((d, i) => {
            const c = segmentColors
              ? d.value >= 0
                ? segmentColors.positive
                : segmentColors.negative
              : defaultColor;
            const r = i === selectedIndex ? selectedDotRadius : dotRadius;
            return (
              <circle
                key={i}
                cx={xScale(i)}
                cy={yScale(d.value)}
                r={r}
                fill={c}
              />
            );
          })}
        {data.map((d, i) =>
          shouldShowLabel(i) ? (
            <text
              key={i}
              x={xScale(i)}
              y={height - 4}
              textAnchor="middle"
              fill={labelColor}
              fontSize={labelFontSize}
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
