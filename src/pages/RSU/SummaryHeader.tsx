import cx from "classnames";
import { LineChart } from "@/components/charts/LineChart";
import { settlementNetShares } from "@/utils/rsu-forecast";
import type { RsuSettlement, RsuVest } from "@/types/types";
import { formatRsuMoney, formatRsuAxisValue, type ShareValueSummary, type ValueTimeline } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

function ShareValueCard({
  title,
  sharesLabel,
  summary,
}: {
  title: string;
  sharesLabel: string;
  summary: ShareValueSummary;
}) {
  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryCardTitle}>{title}</span>
      <div className={styles.summaryStats}>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>{sharesLabel}</span>
          <span className={styles.summaryStatValue}>{summary.shares.toLocaleString()}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Value at Current Price</span>
          <span className={`${styles.summaryStatValue} ${styles.money}`}>
            {formatRsuMoney(summary.currentValue)}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>vs. Grant Price</span>
          <span
            className={cx(styles.summaryStatValue, summary.delta >= 0 ? styles.money : styles.debtColor)}
          >
            {summary.delta >= 0 ? "+" : ""}
            {formatRsuMoney(summary.delta)} ({summary.pct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export function SummaryHeader({
  vests,
  settlements,
  totalRsuValue,
  timeline,
  unvested,
  pendingSettlement,
}: {
  vests: RsuVest[];
  settlements: RsuSettlement[];
  totalRsuValue: number;
  timeline: ValueTimeline;
  unvested: ShareValueSummary;
  pendingSettlement: ShareValueSummary;
}) {
  const hasVested = vests.length > 0 || settlements.length > 0;
  if (!hasVested && unvested.shares === 0 && pendingSettlement.shares === 0) return null;

  const totalShares = settlements.reduce((s, st) => s + settlementNetShares(st), 0);

  return (
    <>
      <div className={styles.summaryRow}>
        {hasVested && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardTitle}>RSU Summary</span>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Total Shares Held</span>
                <span className={styles.summaryStatValue}>{totalShares.toLocaleString()}</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Current Value</span>
                <span className={`${styles.summaryStatValue} ${styles.money}`}>
                  {formatRsuMoney(totalRsuValue)}
                </span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Vesting Events</span>
                <span className={styles.summaryStatValue}>{vests.length}</span>
              </div>
            </div>
          </div>
        )}

        {pendingSettlement.shares > 0 && (
          <ShareValueCard
            title="Pending Settlement"
            sharesLabel="Shares Pending Settlement"
            summary={pendingSettlement}
          />
        )}

        {unvested.shares > 0 && (
          <ShareValueCard title="Unvested Summary" sharesLabel="Unvested Shares" summary={unvested} />
        )}
      </div>

      <div className={styles.sparklineRow}>
        <div className={styles.valueTimelineCard}>
          <span className={styles.sparklineTitle}>RSU Value Over Time</span>
          <p className={styles.sectionNote}>
            Stops at the most recent vest or settlement entry — none of these lines forecast
            forward. All values use today's current price throughout, not historical prices on
            each date.
          </p>
          {timeline.dates.length < 2 ? (
            <span className={styles.summaryEmpty}>Need at least 2 vest or settlement events</span>
          ) : (
            <div className={styles.valueTimelineChart}>
              <LineChart
                x={timeline.dates}
                barCharts={[
                  { name: "Settled", y: timeline.settled, color: "var(--fg-success)" },
                  { name: "Pending Settlement", y: timeline.pending, color: "var(--fg-warning)" },
                  { name: "Unvested", y: timeline.unvested, color: "var(--info)" },
                ]}
                legend
                legendDirection="h"
                legendAlign="start"
                lineShape="hv"
                tooltipValueFormat={formatRsuMoney}
                axisValueFormat={formatRsuAxisValue}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
