import { ReactNode } from "react";
import cx from "classnames";
import styles from "./ChartCard.module.scss";

export function ChartCard({
  children,
  toolbar,
  plain = false,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
  plain?: boolean;
}) {
  return (
    <div className={cx(styles.card, plain && styles.plain)}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      {children}
    </div>
  );
}
