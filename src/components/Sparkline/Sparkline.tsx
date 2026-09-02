import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Sparkline.module.scss";

export type SparklineProps = {
  data: { label: string; value: number }[];
  color?: string;
  segmentColors?: { positive: string; negative: string };
  curve?: "linear" | "smooth";
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
  curve = "smooth",
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

  const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.value) }));

  const stepX = data.length > 1 ? points[1]!.x - points[0]!.x : 1;

  const tangents: number[] = (() => {
    const n = points.length;
    if (n < 3) return [];
    const slopes = points
      .slice(0, -1)
      .map((p, i) => (points[i + 1]!.y - p.y) / stepX);
    const m: number[] = [slopes[0]!];
    for (let i = 1; i < n - 1; i++) {
      const s1 = slopes[i - 1]!;
      const s2 = slopes[i]!;
      m.push(s1 * s2 <= 0 ? 0 : (2 * s1 * s2) / (s1 + s2));
    }
    m.push(slopes[n - 2]!);
    return m;
  })();

  const hasSmooth = curve === "smooth" && tangents.length > 0;

  const curveTo = (i: number) => {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const h = p2.x - p1.x;
    return `C${p1.x + h / 3},${p1.y + (h / 3) * tangents[i]!} ${p2.x - h / 3},${p2.y - (h / 3) * tangents[i + 1]!} ${p2.x},${p2.y}`;
  };

  const segmentCurve = (i: number) =>
    hasSmooth
      ? `M${points[i]!.x},${points[i]!.y}${curveTo(i)}`
      : `M${points[i]!.x},${points[i]!.y}L${points[i + 1]!.x},${points[i + 1]!.y}`;

  const pathD = hasSmooth
    ? `M${points[0]!.x},${points[0]!.y}${points
        .slice(0, -1)
        .map((_, i) => curveTo(i))
        .join("")}`
    : points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
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
            const area = `${segmentCurve(i)}L${xScale(i + 1)},${yScale(0)}L${xScale(i)},${yScale(0)}Z`;
            const line = segmentCurve(i);
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
