import { Delta } from "./Delta";
import { formatCurrency } from "./utils";
import styles from "./Overview.module.scss";

export function SummaryCards({
  realIncome,
  totalSpent,
  net,
  savings,
  rsu,
  prevRealIncome,
  prevTotalSpent,
  prevNet,
  prevSavings,
  prevRsu,
}: {
  realIncome: number;
  totalSpent: number;
  net: number;
  savings: number;
  rsu: number;
  prevRealIncome: number;
  prevTotalSpent: number;
  prevNet: number;
  prevSavings: number;
  prevRsu: number;
}) {
  const cards = [
    {
      label: "Real Income",
      value: realIncome,
      caption: "paychecks, refunds",
      prev: prevRealIncome,
      valueClass: styles.valuePos,
      goodUp: true,
    },
    {
      label: "Spent",
      value: totalSpent,
      caption: "excludes transfers",
      prev: prevTotalSpent,
      valueClass: styles.valueNeg,
      goodUp: false,
    },
    {
      label: "Net",
      value: net,
      caption: "income – spend",
      prev: prevNet,
      valueClass: net >= 0 ? styles.valuePos : styles.valueNeg,
      goodUp: true,
    },
  ];

  return (
    <div className={styles.summaryRow}>
      {cards.map((c) => (
        <div key={c.label} className={styles.summaryCard}>
          <span className={styles.cardLabel}>{c.label}</span>
          <span className={`${styles.cardValue} ${c.valueClass}`}>
            {c.label === "Net" && c.value >= 0 ? "+" : ""}
            {formatCurrency(c.value)}
          </span>
          <span className={styles.cardCaption}>{c.caption}</span>
          <Delta current={c.value} previous={c.prev} goodUp={c.goodUp} />
        </div>
      ))}
      <div className={styles.summaryCard}>
        <span className={styles.cardLabel}>Savings</span>
        <div className={styles.savingsRow}>
          <span className={styles.savingsLabel}>Transfers</span>
          <span className={styles.savingsValue}>{formatCurrency(savings)}</span>
          <Delta current={savings} previous={prevSavings} goodUp={true} />
        </div>
        <div className={styles.savingsRow}>
          <span className={styles.savingsLabel}>RSU</span>
          <span className={styles.savingsValue}>{formatCurrency(rsu)}</span>
          <Delta current={rsu} previous={prevRsu} goodUp={true} />
        </div>
        <span className={styles.cardCaption}>savings / invest</span>
      </div>
    </div>
  );
}
