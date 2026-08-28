import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./ChartTooltip.module.scss";

export type TooltipContent = {
  x: number;
  y: number;
  content: ReactNode;
} | null;

export function formatTooltipMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function TooltipTitle({ children }: { children: ReactNode }) {
  return <div className={styles.title}>{children}</div>;
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: ReactNode;
  value: string;
}) {
  return (
    <div className={styles.row}>
      {color && (
        <span className={styles.swatch} style={{ backgroundColor: color }} />
      )}
      <span>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export function useChartTooltip() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TooltipContent>(null);

  const show = useCallback(
    (clientX: number, clientY: number, content: ReactNode) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTip({ x: clientX - rect.left, y: clientY - rect.top, content });
    },
    []
  );

  const hide = useCallback(() => setTip(null), []);

  return { containerRef, tip, show, hide };
}

export function ChartTooltip({ tip }: { tip: TooltipContent }) {  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const el = ref.current;
    const sw = el.offsetWidth;
    const sh = el.offsetHeight;
    let left = tip.x + 14;
    let top = tip.y + 14;
    const parent = el.parentElement as HTMLElement | null;
    if (parent) {
      if (left + sw > parent.clientWidth) left = tip.x - sw - 14;
      if (top + sh > parent.clientHeight) top = tip.y - sh - 14;
    }
    setPos({ left: Math.max(0, left), top: Math.max(0, top) });
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      ref={ref}
      className={styles.tooltip}
      style={{ left: pos.left, top: pos.top }}
    >
      {tip.content}
    </div>
  );
}
