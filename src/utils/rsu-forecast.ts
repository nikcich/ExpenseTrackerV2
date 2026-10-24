import { addMonths } from "date-fns";
import type { Grant, RsuSettlement, RsuVest, Stock, VestingFrequency } from "@/types/types";

export type ForecastVest = {
  date: string;
  shares: number;
  projectedValue: number;
  isPast: boolean;
};

const FREQUENCY_MONTHS: Record<VestingFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  "semi-annual": 6,
  annual: 12,
};

export function computeForecast(
  grant: Grant,
  vests: RsuVest[],
  stocks: Stock[],
): ForecastVest[] {
  const schedule = grant.vestingSchedule;
  if (!schedule) return [];

  const stock = stocks.find((s) => s.id === grant.stockId);
  const currentPrice = stock?.currentPrice ?? grant.grantPrice;

  const intervalMonths = FREQUENCY_MONTHS[schedule.frequency];
  const totalEvents = (schedule.totalYears * 12) / intervalMonths;
  const eventsPerYear = 12 / intervalMonths;

  const distribution = schedule.distribution;
  const distributionSum = distribution.reduce((a, b) => a + b, 0);
  const normalizedDist =
    distributionSum > 0
      ? distribution.map((d) => d / distributionSum)
      : Array(distribution.length).fill(1 / distribution.length);

  const vestsForGrant = vests.filter((v) => v.grantId === grant.id);
  const vestByDate = new Map<string, RsuVest>();
  for (const v of vestsForGrant) {
    vestByDate.set(v.vestDate, v);
  }

  const now = new Date();
  const forecastVests: ForecastVest[] = [];

  for (let eventIdx = 0; eventIdx < totalEvents; eventIdx++) {
    const vestDate = addMonths(
      new Date(schedule.startDate),
      eventIdx * intervalMonths,
    );

    const dateStr = vestDate.toISOString().split("T")[0];
    const actualVest = vestByDate.get(dateStr);

    if (actualVest) {
      forecastVests.push({
        date: dateStr,
        shares: actualVest.shares,
        projectedValue:
          Math.round(actualVest.shares * currentPrice * 100) / 100,
        isPast: true,
      });
    } else {
      const yearIdx = Math.floor(eventIdx / eventsPerYear);
      const yearPct =
        normalizedDist[Math.min(yearIdx, normalizedDist.length - 1)];
      const sharesPerEvent = (grant.totalShares * yearPct) / eventsPerYear;
      const isPast = vestDate < now;

      forecastVests.push({
        date: dateStr,
        shares: Math.round(sharesPerEvent * 100) / 100,
        projectedValue:
          Math.round(sharesPerEvent * currentPrice * 100) / 100,
        isPast,
      });
    }
  }

  return forecastVests;
}

export function settlementNetShares(settlement: RsuSettlement): number {
  return settlement.shares - (settlement.sharesWithheld ?? 0);
}

export function computeRsuPortfolioValue(
  settlements: RsuSettlement[],
  grantMap: Map<string, Grant>,
  stockMap: Map<string, Stock>
): number {
  return settlements.reduce((sum, settlement) => {
    const grant = grantMap.get(settlement.grantId);
    const stock = grant ? stockMap.get(grant.stockId) : undefined;
    const netShares = settlementNetShares(settlement);
    return sum + netShares * (stock?.currentPrice ?? settlement.basisPrice);
  }, 0);
}
