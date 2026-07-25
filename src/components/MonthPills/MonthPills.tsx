import styles from "./MonthPills.module.scss";

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
    <div className={styles.pills}>
      {months.map((date, i) => (
        <button
          key={date.toISOString()}
          className={`${styles.pill} ${i === selectedIndex ? styles.pillActive : ""}`}
          onClick={() => onChange(i)}
        >
          {fmt(date)}
        </button>
      ))}
    </div>
  );
}
