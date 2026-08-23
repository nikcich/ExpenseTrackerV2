import { ReactNode } from "react";
import styles from "./ChartCard.module.scss";

export function ChartCard({
  children,
  toolbar,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className={styles.card}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      {children}
    </div>
  );
}
