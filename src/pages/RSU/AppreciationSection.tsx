import { EntityTable } from "./EntityTable";
import { formatRsuMoney, type StockAppreciationRow } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

export function AppreciationSection({ rows }: { rows: StockAppreciationRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Appreciation</span>
      </div>
      <EntityTable
        columns={[
          { header: "Stock", render: (row) => row.stock.ticker },
          {
            header: "Current Value",
            align: "right",
            render: (row) => <span className={styles.money}>{formatRsuMoney(row.currentTotal)}</span>,
          },
          {
            header: "At Grant",
            align: "right",
            render: (row) => formatRsuMoney(row.grantTotal),
          },
          {
            header: "From Grant",
            align: "right",
            render: (row) => (
              <span className={row.grantDelta >= 0 ? styles.money : styles.debtColor}>
                {row.grantDelta >= 0 ? "+" : ""}
                {formatRsuMoney(row.grantDelta)} ({row.grantPct.toFixed(1)}%)
              </span>
            ),
          },
          {
            header: "At Basis",
            align: "right",
            render: (row) => formatRsuMoney(row.basisTotal),
          },
          {
            header: "From Basis",
            align: "right",
            render: (row) => (
              <span className={row.basisDelta >= 0 ? styles.money : styles.debtColor}>
                {row.basisDelta >= 0 ? "+" : ""}
                {formatRsuMoney(row.basisDelta)} ({row.basisPct.toFixed(1)}%)
              </span>
            ),
          },
        ]}
        rows={rows.map((row) => ({ ...row, id: row.stock.id }))}
      />
    </div>
  );
}
