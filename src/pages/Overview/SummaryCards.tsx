import { Delta } from "./Delta";
import { formatCurrency } from "@/utils/utils";
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
  ytdIncome,
  ytdSpent,
  ytdNet,
  ytdSavings,
}: {
  realIncome: number;
  totalSpent: number;
  net: number;
  savings: number;
  prevRealIncome: number;
  prevTotalSpent: number;
  prevNet: number;
  prevSavings: number;
  ytdIncome: number;
  ytdSpent: number;
  ytdNet: number;
  ytdSavings: number;
}) {
  const cards = [
    {
      label: "Real Income",
      value: realIncome,
      caption: "paychecks, refunds",
      prev: prevRealIncome,
      valueClass: styles.valuePos,
      goodUp: true,
      ytd: ytdIncome,
    },
    {
      label: "Spent",
      value: totalSpent,
      caption: "excludes transfers",
      prev: prevTotalSpent,
      valueClass: styles.valueNeg,
      goodUp: false,
      ytd: ytdSpent,
    },
    {
      label: "Net",
      value: net,
      caption: "income – spend",
      prev: prevNet,
      valueClass: net >= 0 ? styles.valuePos : styles.valueNeg,
      goodUp: true,
      ytd: ytdNet,
    },
    {
      label: "Savings",
      value: savings,
      caption: "transfers to savings",
      prev: prevSavings,
      valueClass: styles.valueNeutral,
      goodUp: true,
      ytd: ytdSavings,
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
          <span className={styles.cardYtd}>YTD: {formatCurrency(c.ytd)}</span>
          <span className={styles.cardCaption}>{c.caption}</span>
          <Delta current={c.value} previous={c.prev} goodUp={c.goodUp} />
        </div>
      ))}
    </div>
  );
}
