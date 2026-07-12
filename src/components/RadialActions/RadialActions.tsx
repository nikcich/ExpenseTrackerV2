import { useEffect, useMemo, useState } from "react";
import styles from "./RadialActions.module.scss";

export interface RadialAction {
  id: string;
  label: string;
  active?: boolean;
}

interface RadialActionsProps {
  actions: RadialAction[];
  position: { x: number; y: number };
  hoveredAction: string | null;
  onActionEnter: (id: string) => void;
  onActionLeave: () => void;
}

const OUTER_R = 120;
const INNER_R = 44;
const GAP_DEG = 1.5;
const LINE_HEIGHT = 12;
const CHAR_WIDTH = 5.5;

const wrapText = (text: string, maxChars: number): string[] => {
  const normalized = text.replace(/[_\/]/g, " ");
  if (normalized.length <= maxChars) return [normalized];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length <= maxChars) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (line) lines.push(line);

  return lines.length > 0 ? lines : [normalized];
};

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

export const RadialActions = ({
  actions,
  position,
  hoveredAction,
  onActionEnter,
  onActionLeave,
}: RadialActionsProps) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const totalGap = GAP_DEG * actions.length;
  const sweepDeg = (360 - totalGap) / actions.length;

  const wedges = useMemo(() => {
    return actions.map((action, i) => {
      const startDeg = i * (sweepDeg + GAP_DEG) - 90;
      const endDeg = startDeg + sweepDeg;
      const path = describeArc(0, 0, OUTER_R, INNER_R, startDeg, endDeg);

      const midDeg = (startDeg + endDeg) / 2;
      const mid = (midDeg * Math.PI) / 180;
      const labelR = (OUTER_R + INNER_R) / 2;
      const lx = labelR * Math.cos(mid);
      const ly = labelR * Math.sin(mid);
      const textAngle = midDeg > 90 && midDeg < 270 ? midDeg + 180 : midDeg;
      const arcLength = labelR * (sweepDeg * Math.PI / 180);
      const maxChars = Math.floor(arcLength / CHAR_WIDTH);

      return { ...action, path, lx, ly, textAngle, maxChars };
    });
  }, [actions, sweepDeg]);

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
          {wedges.map(({ id, label, active, path, lx, ly, textAngle, maxChars }) => {
            const isHovered = hoveredAction === id;
            const lines = wrapText(label, maxChars);
            return (
              <g key={id}>
                <path
                  d={path}
                  className={[
                    styles.wedge,
                    isHovered ? styles.wedgeHovered : "",
                    active ? styles.wedgeActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => onActionEnter(id)}
                  onMouseLeave={onActionLeave}
                />
                <text
                  x={lx}
                  y={ly}
                  transform={`rotate(${textAngle}, ${lx}, ${ly})`}
                  className={[
                    styles.label,
                    isHovered ? styles.labelHovered : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  pointerEvents="none"
                >
                  {lines.map((line, j) => (
                    <tspan
                      key={j}
                      x={lx}
                      dy={
                        j === 0
                          ? `${-((lines.length - 1) * LINE_HEIGHT) / 2}px`
                          : `${LINE_HEIGHT}px`
                      }
                    >
                      {line}
                    </tspan>
                  ))}
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
