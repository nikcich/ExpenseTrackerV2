import styles from "./Overview.module.scss";

export function MonthPills({
  months,
  selectedIndex,
  onChange,
}: {
  months: Date[];
  selectedIndex: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className={styles.monthPills}>
      {months.map((date, i) => (
        <button
          key={date.toISOString()}
          className={`${styles.monthPill} ${i === selectedIndex ? styles.monthPillActive : ""}`}
          onClick={() => onChange(i)}
        >
          {date.toLocaleString("default", { month: "short", year: "numeric" })}
        </button>
      ))}
    </div>
  );
}
