import styles from "./Overview.module.scss";

export function MonthPills({
  months,
  selectedIndex,
  onChange,
  formatLabel,
}: {
  months: Date[];
  selectedIndex: number;
  onChange: (i: number) => void;
  formatLabel?: (date: Date) => string;
}) {
  const fmt = formatLabel ?? ((date: Date) =>
    date.toLocaleString("default", { month: "short", year: "numeric" })
  );
  return (
    <div className={styles.monthPills}>
      {months.map((date, i) => (
        <button
          key={date.toISOString()}
          className={`${styles.monthPill} ${i === selectedIndex ? styles.monthPillActive : ""}`}
          onClick={() => onChange(i)}
        >
          {fmt(date)}
        </button>
      ))}
    </div>
  );
}
