import { memo } from "react";
import styles from "./MonthPills.module.scss";

export const MonthPills = memo(function MonthPills({
  months,
  selectedIndex,
  onChange,
  formatLabel,
}: {
  months: Date[];
  selectedIndex: number;
  onChange: (i: number) => void;
  formatLabel?: (date: Date, index: number) => string;
}) {
  const fmt = formatLabel ?? ((date: Date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" })
  );
  return (
    <div className={styles.pills}>
      {months.map((date, i) => (
        <button
          key={date.toISOString()}
          className={`${styles.pill} ${i === selectedIndex ? styles.pillActive : ""}`}
          onClick={() => onChange(i)}
        >
          {fmt(date, i)}
        </button>
      ))}
    </div>
  );
});
