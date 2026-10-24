import cx from "classnames";
import { SegmentGroup } from "@chakra-ui/react";
import { EntityTable } from "./EntityTable";
import { formatRsuMoney, type TotalValueRow } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

export function TotalValueSection({
  rows,
  mode,
  setMode,
}: {
  rows: TotalValueRow[];
  mode: "stock" | "grant";
  setMode: (mode: "stock" | "grant") => void;
}) {
  const grandSettled = rows.reduce((s, r) => s + r.settledValue, 0);
  const grandToVest = rows.reduce((s, r) => s + r.toVestValue, 0);
  const grandTotal = grandSettled + grandToVest;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Total RSU Value</span>
        <SegmentGroup.Root
          value={mode}
          onValueChange={(e) => setMode(e.value as "stock" | "grant")}
          size="sm"
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={["stock", "grant"]} />
        </SegmentGroup.Root>
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyNote}>No RSU data to summarize.</div>
      ) : (
        <EntityTable
          columns={[
            { header: mode === "stock" ? "Stock" : "Grant", render: (r) => r.label },
            {
              header: "Settled Shares",
              align: "right",
              render: (r) => r.settledShares.toLocaleString(),
            },
            {
              header: "Settled Value",
              align: "right",
              render: (r) => <span className={styles.money}>{formatRsuMoney(r.settledValue)}</span>,
            },
            {
              header: "To Vest",
              align: "right",
              render: (r) => r.toVestShares.toLocaleString(),
            },
            {
              header: "To Vest Value",
              align: "right",
              render: (r) => <span className={styles.money}>{formatRsuMoney(r.toVestValue)}</span>,
            },
            {
              header: "Total Value",
              align: "right",
              render: (r) => (
                <span className={styles.money}>{formatRsuMoney(r.settledValue + r.toVestValue)}</span>
              ),
            },
          ]}
          rows={rows}
          footer={
            rows.length > 1 ? (
              <tr className={styles.summaryTotalsRow}>
                <td>Total</td>
                <td className={styles.num}>
                  {rows.reduce((s, r) => s + r.settledShares, 0).toLocaleString()}
                </td>
                <td className={cx(styles.num, styles.money)}>{formatRsuMoney(grandSettled)}</td>
                <td className={styles.num}>
                  {rows.reduce((s, r) => s + r.toVestShares, 0).toLocaleString()}
                </td>
                <td className={cx(styles.num, styles.money)}>{formatRsuMoney(grandToVest)}</td>
                <td className={cx(styles.num, styles.money)}>{formatRsuMoney(grandTotal)}</td>
              </tr>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
