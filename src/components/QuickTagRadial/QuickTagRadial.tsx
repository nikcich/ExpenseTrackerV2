import { Tag } from "@/types/types";
import { useEffect, useMemo, useState } from "react";
import styles from "./QuickTagRadial.module.scss";

interface QuickTagRadialProps {
  tags: string[];
  appliedTags: Tag[];
  position: { x: number; y: number };
  hoveredTag: string | null;
  onTagEnter: (tag: string) => void;
  onTagLeave: () => void;
}

const OUTER_R = 120;
const INNER_R = 44;
const GAP_DEG = 1.5;

const describeArc = (
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);

  const ox1 = cx + outerR * Math.cos(s);
  const oy1 = cy + outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e);
  const oy2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(e);
  const iy1 = cy + innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s);
  const iy2 = cy + innerR * Math.sin(s);

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    "Z",
  ].join(" ");
};

const midAngle = (startDeg: number, endDeg: number) =>
  ((startDeg + endDeg) / 2 * Math.PI) / 180;

export const QuickTagRadial = ({
  tags,
  appliedTags,
  position,
  hoveredTag,
  onTagEnter,
  onTagLeave,
}: QuickTagRadialProps) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const totalGap = GAP_DEG * tags.length;
  const sweepDeg = (360 - totalGap) / tags.length;

  const wedges = useMemo(() => {
    return tags.map((tag, i) => {
      const startDeg = i * (sweepDeg + GAP_DEG) - 90;
      const endDeg = startDeg + sweepDeg;
      const path = describeArc(0, 0, OUTER_R, INNER_R, startDeg, endDeg);

      const mid = midAngle(startDeg, endDeg);
      const labelR = (OUTER_R + INNER_R) / 2;
      const lx = labelR * Math.cos(mid);
      const ly = labelR * Math.sin(mid);

      return { tag, path, lx, ly, startDeg, endDeg };
    });
  }, [tags, sweepDeg]);

  const size = OUTER_R * 2 + 24;
  const center = size / 2;

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.container} ${entered ? styles.entered : ""}`}
        style={{ left: position.x, top: position.y, width: size, height: size }}
      >
        <svg
          viewBox={`${-center} ${-center} ${size} ${size}`}
          className={styles.svg}
        >
          {wedges.map(({ tag, path, lx, ly }) => {
            const isApplied = appliedTags.includes(tag);
            const isHovered = hoveredTag === tag;
            return (
              <g key={tag}>
                <path
                  d={path}
                  className={[
                    styles.wedge,
                    isHovered ? styles.wedgeHovered : "",
                    isApplied ? styles.wedgeApplied : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => onTagEnter(tag)}
                  onMouseLeave={onTagLeave}
                />
                <text
                  x={lx}
                  y={ly}
                  className={[
                    styles.label,
                    isHovered ? styles.labelHovered : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => onTagEnter(tag)}
                  onMouseLeave={onTagLeave}
                  pointerEvents="none"
                >
                  {isApplied ? `\u2713 ${tag}` : tag}
                </text>
              </g>
            );
          })}

          <circle r={INNER_R} className={styles.centerCircle} />
        </svg>
      </div>
    </div>
  );
};
