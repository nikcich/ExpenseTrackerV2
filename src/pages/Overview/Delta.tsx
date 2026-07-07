import { formatPercent } from "@/utils/utils";
import styles from "./Overview.module.scss";

export function Delta({
  current,
  previous,
  goodUp,
}: {
  current: number;
  previous: number;
  goodUp: boolean;
}) {
  if (previous === 0) {
    return current === 0 ? null : <span className={styles.delta}>—</span>;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className={styles.delta}>0%</span>;
  const isUp = current > previous;
  const good = isUp === goodUp;
  const cls = good ? styles.deltaUp : styles.deltaDown;
  return (
    <span className={cls}>
      <span className={styles.deltaArrow}>{isUp ? "↑" : "↓"}</span>
      <span>{formatPercent(Math.abs(pct))}</span>
    </span>
  );
}
