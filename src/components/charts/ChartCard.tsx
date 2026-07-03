import { ReactNode } from "react";
import styles from "./ChartCard.module.scss";

export function ChartCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}
