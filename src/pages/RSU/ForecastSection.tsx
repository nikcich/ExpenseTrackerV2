import { SegmentGroup } from "@chakra-ui/react";
import cx from "classnames";
import type { Grant, RsuVest, Stock } from "@/types/types";
import { formatShortDate } from "@/utils/utils";
import { LineChart } from "@/components/charts/LineChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { EntityTable } from "./EntityTable";
import { formatRsuMoney, formatRsuAxisValue, type ForecastChartData } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

export function ForecastSection({
  grants,
  vests,
  stockMap,
  chartData,
  forecastUnit,
  setForecastUnit,
  forecastPrices,
  setForecastPrices,
  selectedForecastGrantId,
  setSelectedForecastGrantId,
}: {
  grants: Grant[];
  vests: RsuVest[];
  stockMap: Map<string, Stock>;
  chartData: ForecastChartData;
  forecastUnit: "shares" | "dollars";
  setForecastUnit: (unit: "shares" | "dollars") => void;
  forecastPrices: Map<string, number>;
  setForecastPrices: (prices: Map<string, number>) => void;
  selectedForecastGrantId: string | null;
  setSelectedForecastGrantId: (id: string) => void;
}) {
  const hasSchedule = grants.some((g) => g.vestingSchedule);
  if (!hasSchedule && vests.length === 0) return null;

  const { grantForecasts, allPoints, totalRemaining, totalRemainingValue, sortedYears, yearlyActual, yearlyForecast } =
    chartData;

  const activeId = selectedForecastGrantId ?? grantForecasts[0]?.grant.id;
  const activeForecast = grantForecasts.find((g) => g.grant.id === activeId);

  const tooltipValueFormat = (value: number) =>
    forecastUnit === "dollars"
      ? formatRsuMoney(value)
      : `${Math.round(value).toLocaleString()} ${Math.round(value) === 1 ? "share" : "shares"}`;

  const axisValueFormat = forecastUnit === "dollars" ? formatRsuAxisValue : undefined;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Vesting Forecast</span>
        <div className={styles.forecastControls}>
          {forecastUnit === "dollars" && (
            <div className={styles.priceInputs}>
              {[...forecastPrices.entries()].map(([stockId, price]) => {
                const stock = stockMap.get(stockId);
                const maxPrice = (stock?.currentPrice ?? price) * 10;
                return (
                  <div key={stockId} className={styles.priceSlider}>
                    <span className={styles.fieldLabel}>{stock?.ticker ?? stockId}</span>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(maxPrice, 1000)}
                      step={1}
                      value={price}
                      onChange={(e) => {
                        const next = new Map(forecastPrices);
                        next.set(stockId, Number(e.target.value));
                        setForecastPrices(next);
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={price}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value)) {
                          const next = new Map(forecastPrices);
                          next.set(stockId, value);
                          setForecastPrices(next);
                        }
                      }}
                      className={styles.priceInput}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <SegmentGroup.Root
            value={forecastUnit}
            onValueChange={(e) => setForecastUnit(e.value as "shares" | "dollars")}
            size="sm"
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={["shares", "dollars"]} />
          </SegmentGroup.Root>
        </div>
      </div>

      <div className={styles.forecastSummaryRow}>
        <div className={styles.forecastSummaryStat}>
          <span className={styles.summaryStatLabel}>Remaining Shares</span>
          <span className={styles.summaryStatValue}>{totalRemaining.toLocaleString()}</span>
        </div>
        <div className={styles.forecastSummaryStat}>
          <span className={styles.summaryStatLabel}>Projected Value</span>
          <span className={cx(styles.summaryStatValue, styles.money)}>
            {forecastUnit === "dollars"
              ? formatRsuMoney(totalRemainingValue)
              : `${totalRemaining.toLocaleString()} shares`}
          </span>
        </div>
      </div>

      {allPoints.length >= 2 && (
        <div className={styles.forecastChartCard}>
          <LineChart
            x={allPoints.map((p) => p.date)}
            barCharts={[
              {
                name: "Cumulative Forecast",
                y: allPoints.map((p) => p.forecast),
                color: "var(--info)",
              },
              {
                name: "Actual Vested",
                y: allPoints.map((p) => p.actual),
                color: "var(--fg-success)",
              },
            ]}
            legend
            legendDirection="h"
            legendAlign="start"
            lineShape="hv"
            tooltipValueFormat={tooltipValueFormat}
            axisValueFormat={axisValueFormat}
          />
        </div>
      )}

      {allPoints.length >= 2 && sortedYears.length > 0 && (
        <div className={styles.forecastChartCard}>
          <StackedBarChart
            data={[
              {
                x: sortedYears,
                y: sortedYears.map((y) => yearlyActual.get(y) ?? 0),
                name: "Actual Vested",
                type: "bar",
              },
              {
                x: sortedYears,
                y: sortedYears.map((y) => yearlyForecast.get(y) ?? 0),
                name: "Forecast",
                type: "bar",
              },
            ]}
            legend
            legendDirection="h"
            legendAlign="start"
            tooltipValueFormat={tooltipValueFormat}
            axisValueFormat={axisValueFormat}
          />
        </div>
      )}

      {grantForecasts.length > 1 && (
        <div className={styles.forecastGrantSelector}>
          <select
            className={styles.fieldInput}
            value={activeId}
            onChange={(e) => setSelectedForecastGrantId(e.target.value)}
          >
            {grantForecasts.map((gf) => (
              <option key={gf.grant.id} value={gf.grant.id}>
                {gf.grant.name}
                {gf.ticker ? ` (${gf.ticker})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeForecast && (
        <div className={styles.forecastGrantBlock}>
          <EntityTable
            columns={[
              { header: "Date", render: (f) => formatShortDate(f.date) },
              { header: "Shares", align: "right", render: (f) => f.shares.toLocaleString() },
              {
                header: "Projected Value",
                align: "right",
                render: (f) => formatRsuMoney(f.projectedValue),
              },
              {
                header: "Status",
                render: (f) => (
                  <span className={f.isPast ? styles.forecastStatusPast : styles.forecastStatusFuture}>
                    {f.isPast ? "Vested" : "Upcoming"}
                  </span>
                ),
              },
            ]}
            rows={activeForecast.forecast.map((f, idx) => ({ ...f, id: String(idx) }))}
            rowClassName={(f) => (f.isPast ? styles.forecastPastRow : undefined)}
          />
        </div>
      )}
    </div>
  );
}
