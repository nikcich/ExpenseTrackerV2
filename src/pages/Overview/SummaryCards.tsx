import { Delta } from "./Delta";
import { formatCurrency } from "./utils";
import styles from "./Overview.module.scss";

export function SummaryCards({
  realIncome,
  totalSpent,
  net,
  savings,
  prevRealIncome,
  prevTotalSpent,
  prevNet,
  prevSavings,
}: {
  realIncome: number;
  totalSpent: number;
  net: number;
  savings: number;
  prevRealIncome: number;
  prevTotalSpent: number;
  prevNet: number;
  prevSavings: number;
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
    {
      label: "Savings & Retirement",
      value: savings,
      caption: "transfers to savings/retirement",
      prev: prevSavings,
      valueClass: styles.valueNeutral,
      goodUp: true,
    },
  ];

  return (
    <div className={styles.summaryRow}>
      {cards.map((c) => (
        <div key={c.label} className={styles.summaryCard}>
          <span className={styles.cardLabel}>{c.label}</span>
          <span className={`${styles.cardValue} ${c.valueClass}`}>
            {formatCurrency(c.value)}
          </span>
          <span className={styles.cardCaption}>{c.caption}</span>
          <Delta current={c.value} previous={c.prev} goodUp={c.goodUp} />
        </div>
      ))}
    </div>
  );
}
