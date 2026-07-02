import { useMemo, useState } from "react";
import * as d3 from "d3";
import { formatCurrency } from "./utils";
import styles from "./Overview.module.scss";

const CATEGORY_COLORS = [
  "#6366F1",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#EC4899",
  "#6B7280",
  "#14B8A6",
  "#E11D48",
  "#84CC16",
  "#D946EF",
  "#0EA5E9",
  "#F43F5E",
];

const VB = 200;
const VB_RADIUS = VB / 2;
const THICKNESS = 50;
const INNER_R = VB_RADIUS - THICKNESS;

export function DonutChart({
  categories,
  totalSpent,
  disabledCategories,
  onToggle,
}: {
  categories: { name: string; amount: number }[];
  totalSpent: number;
  disabledCategories: Set<string>;
  onToggle: (name: string) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isDimmed = (i: number) => {
    const name = pieData[i]?.data.name;
    if (name && disabledCategories.has(name)) return true;
    return hoveredIndex !== null && hoveredIndex !== i;
  };

  const pieData = useMemo(() => {
    if (categories.length === 0) return [];
    const top = categories.slice(0, 8);
    const rest = categories.slice(8);
    const data =
      rest.length > 0
        ? [
            ...top,
            { name: "Other", amount: rest.reduce((s, c) => s + c.amount, 0) },
          ]
        : top;
    const pieGen = d3
      .pie<{ name: string; amount: number }>()
      .value((d: any) => d.amount);
    return pieGen(data);
  }, [categories]);

  const arcPath = useMemo(() => {
    const arcGen = d3.arc<any>().innerRadius(INNER_R).outerRadius(VB_RADIUS);
    return pieData.map((d) => arcGen(d));
  }, [pieData]);

  return (
    <div className={styles.donutContainer}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className={styles.donutSvg}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {pieData.length === 0 ? (
          <circle
            cx={VB_RADIUS}
            cy={VB_RADIUS}
            r={VB_RADIUS - 2}
            fill="none"
            stroke="#32323c"
            strokeWidth={THICKNESS}
          />
        ) : (
          <g transform={`translate(${VB_RADIUS},${VB_RADIUS})`}>
            {pieData.map((d, i) => (
              <path
                key={d.data.name}
                d={arcPath[i] || ""}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                stroke="none"
                opacity={isDimmed(i) ? 0.2 : 1}
                onMouseEnter={() => setHoveredIndex(i)}
                onClick={() => onToggle(d.data.name)}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
              />
            ))}
          </g>
        )}
      </svg>
      <div
        className={styles.legendList}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {pieData.map((d, i) => {
          const pct = totalSpent > 0 ? (d.data.amount / totalSpent) * 100 : 0;
          return (
            <div
              key={d.data.name}
              className={styles.legendItem}
              onMouseEnter={() => setHoveredIndex(i)}
              onClick={() => onToggle(d.data.name)}
              style={{
                opacity: isDimmed(i) ? 0.3 : 1,
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
            >
              <span className={styles.legendLabel}>
                <span
                  className={styles.legendSwatch}
                  style={{
                    background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  }}
                />
                <span className={styles.legendName}>{d.data.name}</span>
              </span>
              <span className={styles.legendAmount}>
                {formatCurrency(d.data.amount)}
                <span className={styles.legendPct}>
                  &nbsp;({pct.toFixed(0)}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
