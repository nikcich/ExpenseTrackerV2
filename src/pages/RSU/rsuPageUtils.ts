import type { Grant, RsuSettlement, RsuVest, Stock } from "@/types/types";
import { computeForecast, settlementNetShares } from "@/utils/rsu-forecast";

// RSU dollar amounts (grant/basis prices, vest values) are routinely under
// $100 and the difference between e.g. $94.80 and $95 matters here, so this
// page always shows exactly 2 decimal places rather than the app-wide
// formatCurrency()'s whole-dollar rounding.
export function formatRsuMoney(n: number): string {
  const formatted = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

// Same precision rule for chart axis ticks, which otherwise fall back to the
// shared valFormat()'s whole-number/one-decimal rounding. No "$" prefix,
// matching every other chart axis in the app.
export function formatRsuAxisValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(2)}k`;
  return v.toFixed(2);
}

export function buildEntityMaps(stocks: Stock[], grants: Grant[]) {
  const stockMap = new Map(stocks.map((s) => [s.id, s]));
  const grantMap = new Map(grants.map((g) => [g.id, g]));
  return { stockMap, grantMap };
}

export function grantsUsingStock(stockId: string, grants: Grant[]): Grant[] {
  return grants.filter((g) => g.stockId === stockId);
}

export function vestsUsingGrant(grantId: string, vests: RsuVest[]): RsuVest[] {
  return vests.filter((v) => v.grantId === grantId);
}

export function settlementsUsingGrant(
  grantId: string,
  settlements: RsuSettlement[]
): RsuSettlement[] {
  return settlements.filter((s) => s.grantId === grantId);
}

export type ShareValueSummary = {
  shares: number;
  currentValue: number;
  grantValue: number;
  delta: number;
  pct: number;
};

export function computeUnvestedSummary(
  grants: Grant[],
  vests: RsuVest[],
  stocks: Stock[]
): ShareValueSummary {
  let shares = 0;
  let currentValue = 0;
  let grantValue = 0;

  for (const g of grants) {
    if (!g.vestingSchedule) continue;
    const future = computeForecast(g, vests, stocks).filter((f) => !f.isPast);
    const futureShares = future.reduce((s, f) => s + f.shares, 0);
    const futureValue = future.reduce((s, f) => s + f.projectedValue, 0);
    shares += futureShares;
    currentValue += futureValue;
    grantValue += futureShares * g.grantPrice;
  }

  const delta = currentValue - grantValue;
  return {
    shares,
    currentValue,
    grantValue,
    delta,
    pct: grantValue > 0 ? (delta / grantValue) * 100 : 0,
  };
}

export function computePendingSettlementSummary(
  grants: Grant[],
  vests: RsuVest[],
  settlements: RsuSettlement[],
  stockMap: Map<string, Stock>
): ShareValueSummary {
  const vestedByGrant = new Map<string, number>();
  for (const v of vests) {
    vestedByGrant.set(v.grantId, (vestedByGrant.get(v.grantId) ?? 0) + v.shares);
  }
  // Gross shares, not net — once a settlement has processed a batch of
  // vested shares at all (even if some were withheld for taxes), those
  // shares are no longer "pending settlement."
  const settledGrossByGrant = new Map<string, number>();
  for (const st of settlements) {
    settledGrossByGrant.set(st.grantId, (settledGrossByGrant.get(st.grantId) ?? 0) + st.shares);
  }

  let shares = 0;
  let currentValue = 0;
  let grantValue = 0;

  for (const g of grants) {
    const vested = vestedByGrant.get(g.id) ?? 0;
    const settledGross = settledGrossByGrant.get(g.id) ?? 0;
    const pending = Math.max(0, vested - settledGross);
    if (pending === 0) continue;
    const price = stockMap.get(g.stockId)?.currentPrice ?? g.grantPrice;
    shares += pending;
    currentValue += pending * price;
    grantValue += pending * g.grantPrice;
  }

  const delta = currentValue - grantValue;
  return {
    shares,
    currentValue,
    grantValue,
    delta,
    pct: grantValue > 0 ? (delta / grantValue) * 100 : 0,
  };
}

export type StockAppreciationRow = {
  stock: Stock;
  grantTotal: number;
  basisTotal: number;
  currentTotal: number;
  grantDelta: number;
  basisDelta: number;
  grantPct: number;
  basisPct: number;
};

export function computeStockAppreciation(
  stocks: Stock[],
  grants: Grant[],
  settlements: RsuSettlement[]
): StockAppreciationRow[] {
  return stocks
    .map((stock) => {
      const stockGrants = grants.filter((g) => g.stockId === stock.id);
      const stockGrantIds = new Set(stockGrants.map((g) => g.id));
      const stockSettlements = settlements.filter((s) => stockGrantIds.has(s.grantId));

      const grantTotal = stockSettlements.reduce((s, st) => {
        const grant = stockGrants.find((g) => g.id === st.grantId);
        return s + settlementNetShares(st) * (grant?.grantPrice ?? 0);
      }, 0);
      const basisTotal = stockSettlements.reduce(
        (s, st) => s + settlementNetShares(st) * st.basisPrice,
        0
      );
      const currentTotal = stockSettlements.reduce(
        (s, st) => s + settlementNetShares(st) * stock.currentPrice,
        0
      );

      const grantDelta = currentTotal - grantTotal;
      const basisDelta = currentTotal - basisTotal;

      return {
        stock,
        grantTotal,
        basisTotal,
        currentTotal,
        grantDelta,
        basisDelta,
        grantPct: grantTotal > 0 ? (grantDelta / grantTotal) * 100 : 0,
        basisPct: basisTotal > 0 ? (basisDelta / basisTotal) * 100 : 0,
      };
    })
    .filter((s) => s.currentTotal > 0);
}

export type ForecastPoint = {
  date: string;
  actual: number | null;
  forecast: number | null;
};

export type GrantForecast = {
  grant: Grant;
  forecast: ReturnType<typeof computeForecast>;
  futureVests: ReturnType<typeof computeForecast>;
  remainingShares: number;
  remainingValue: number;
  ticker: string | undefined;
};

export type ForecastChartData = {
  grantForecasts: GrantForecast[];
  allPoints: ForecastPoint[];
  totalRemaining: number;
  totalRemainingValue: number;
  sortedYears: string[];
  yearlyActual: Map<string, number>;
  yearlyForecast: Map<string, number>;
};

type StockEntry = { shares: number; stockId: string };

export function buildForecastChartData(
  grants: Grant[],
  vests: RsuVest[],
  stocks: Stock[],
  grantMap: Map<string, Grant>,
  stockMap: Map<string, Stock>,
  forecastPrices: Map<string, number>,
  forecastUnit: "shares" | "dollars"
): ForecastChartData {
  const grantsWithSchedule = grants.filter((g) => g.vestingSchedule);

  const grantForecasts: GrantForecast[] = grantsWithSchedule.map((g) => {
    const forecast = computeForecast(g, vests, stocks);
    const futureVests = forecast.filter((f) => !f.isPast);
    const remainingShares = futureVests.reduce((s, f) => s + f.shares, 0);
    const remainingValue = futureVests.reduce((s, f) => s + f.projectedValue, 0);
    const stock = stockMap.get(g.stockId);
    return {
      grant: g,
      forecast,
      futureVests,
      remainingShares,
      remainingValue,
      ticker: stock?.ticker,
    };
  });

  const actualByDate = new Map<string, StockEntry[]>();
  for (const v of vests) {
    const grant = grantMap.get(v.grantId);
    const stockId = grant?.stockId ?? "";
    const arr = actualByDate.get(v.vestDate) ?? [];
    arr.push({ shares: v.shares, stockId });
    actualByDate.set(v.vestDate, arr);
  }

  const forecastByDate = new Map<string, StockEntry[]>();
  for (const gf of grantForecasts) {
    for (const f of gf.forecast) {
      if (!f.isPast) {
        const arr = forecastByDate.get(f.date) ?? [];
        arr.push({ shares: f.shares, stockId: gf.grant.stockId });
        forecastByDate.set(f.date, arr);
      }
    }
  }

  const sumStockValue = (entries: StockEntry[]) =>
    entries.reduce((s, e) => {
      const price = forecastPrices.get(e.stockId) ?? stockMap.get(e.stockId)?.currentPrice ?? 0;
      return s + e.shares * (forecastUnit === "dollars" ? price : 1);
    }, 0);

  const allDates = new Set([...actualByDate.keys(), ...forecastByDate.keys()]);
  const sortedDates = [...allDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const lastActualDate = [...actualByDate.keys()].sort().pop() ?? null;
  const allPoints: ForecastPoint[] = [];
  let cumActual = 0;
  let cumForecast = 0;
  let cumForecastAtTransition = 0;
  for (const date of sortedDates) {
    cumActual += sumStockValue(actualByDate.get(date) ?? []);
    cumForecast += sumStockValue(forecastByDate.get(date) ?? []);
    if (lastActualDate && date <= lastActualDate) {
      if (date === lastActualDate) cumForecastAtTransition = cumForecast;
      allPoints.push({
        date,
        actual: cumActual,
        forecast: date === lastActualDate ? cumActual : null,
      });
    } else {
      allPoints.push({
        date,
        actual: null,
        forecast: cumActual + (cumForecast - cumForecastAtTransition),
      });
    }
  }

  const totalRemaining = grantForecasts.reduce((s, gf) => s + gf.remainingShares, 0);
  const totalRemainingValue = grantForecasts.reduce((s, gf) => {
    const price = forecastPrices.get(gf.grant.stockId) ?? 0;
    return s + gf.remainingShares * (forecastUnit === "dollars" ? price : 0);
  }, 0);

  const yearlyActual = new Map<string, number>();
  const yearlyForecast = new Map<string, number>();
  for (const [date, entries] of actualByDate) {
    const year = date.slice(0, 4);
    yearlyActual.set(year, (yearlyActual.get(year) ?? 0) + sumStockValue(entries));
  }
  for (const [date, entries] of forecastByDate) {
    const year = date.slice(0, 4);
    yearlyForecast.set(year, (yearlyForecast.get(year) ?? 0) + sumStockValue(entries));
  }
  const sortedYears = [...new Set([...yearlyActual.keys(), ...yearlyForecast.keys()])].sort();

  return {
    grantForecasts,
    allPoints,
    totalRemaining,
    totalRemainingValue,
    sortedYears,
    yearlyActual,
    yearlyForecast,
  };
}

export type TotalValueRow = {
  id: string;
  label: string;
  settledShares: number;
  settledValue: number;
  toVestShares: number;
  toVestValue: number;
};

export function buildTotalValueRows(
  mode: "stock" | "grant",
  stocks: Stock[],
  grants: Grant[],
  vests: RsuVest[],
  settlements: RsuSettlement[],
  stockMap: Map<string, Stock>,
  forecastPrices: Map<string, number>
): TotalValueRow[] {
  const priceFor = (stockId: string, fallback = 0) =>
    forecastPrices.get(stockId) ?? stockMap.get(stockId)?.currentPrice ?? fallback;

  const futureSharesByGrant = new Map<string, number>();
  for (const g of grants) {
    if (!g.vestingSchedule) continue;
    const future = computeForecast(g, vests, stocks).filter((f) => !f.isPast);
    futureSharesByGrant.set(g.id, future.reduce((s, f) => s + f.shares, 0));
  }

  const netSettledByGrant = new Map<string, number>();
  for (const st of settlements) {
    netSettledByGrant.set(
      st.grantId,
      (netSettledByGrant.get(st.grantId) ?? 0) + settlementNetShares(st)
    );
  }

  const rows: TotalValueRow[] = [];

  if (mode === "stock") {
    for (const stock of stocks) {
      const stockGrantIds = new Set(grants.filter((g) => g.stockId === stock.id).map((g) => g.id));
      const settledShares = settlements
        .filter((st) => stockGrantIds.has(st.grantId))
        .reduce((s, st) => s + settlementNetShares(st), 0);
      if (settledShares === 0 && stockGrantIds.size === 0) continue;
      const toVestShares = grants
        .filter((g) => g.stockId === stock.id)
        .reduce((s, g) => s + (futureSharesByGrant.get(g.id) ?? 0), 0);
      const price = priceFor(stock.id);
      rows.push({
        id: stock.id,
        label: stock.ticker || stock.id,
        settledShares,
        settledValue: settledShares * price,
        toVestShares,
        toVestValue: toVestShares * price,
      });
    }
  } else {
    for (const g of grants) {
      const settledShares = netSettledByGrant.get(g.id) ?? 0;
      const toVestShares = futureSharesByGrant.get(g.id) ?? 0;
      if (settledShares === 0 && toVestShares === 0) continue;
      const price = priceFor(g.stockId, g.grantPrice);
      rows.push({
        id: g.id,
        label: g.name,
        settledShares,
        settledValue: settledShares * price,
        toVestShares,
        toVestValue: toVestShares * price,
      });
    }
  }

  return rows;
}

export type ValueTimeline = {
  dates: string[];
  settled: number[];
  pending: number[];
  unvested: number[];
};

type DatedEvent = { date: string; grantId: string };

// Builds three time-aligned series, all valued at TODAY's current stock
// price throughout (this app has no historical price data, so the lines
// show how the share-count split evolved, scaled by one constant price —
// not a true historical valuation).
//
// Bounded to actual vest/settlement events only — stops at the most recent
// one, same as "today" for practical purposes. No forecasting: Unvested is
// just totalShares minus what's actually vested so far, not a schedule
// projection (see the separate Vesting Forecast chart for that).
export function buildValueTimeline(
  grants: Grant[],
  vests: RsuVest[],
  settlements: RsuSettlement[],
  stockMap: Map<string, Stock>
): ValueTimeline {
  const priceFor = (g: Grant) => stockMap.get(g.stockId)?.currentPrice ?? g.grantPrice;
  const grantsById = new Map(grants.map((g) => [g.id, g]));

  const vestEvents: (DatedEvent & { grossShares: number })[] = vests.map((v) => ({
    date: v.vestDate,
    grantId: v.grantId,
    grossShares: v.shares,
  }));
  const settlementEvents: (DatedEvent & { grossShares: number; netShares: number })[] = settlements.map(
    (s) => ({
      date: s.date,
      grantId: s.grantId,
      grossShares: s.shares,
      netShares: settlementNetShares(s),
    })
  );

  const dates = [...new Set([...vestEvents, ...settlementEvents].map((e) => e.date))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const vestedByGrant = new Map<string, number>();
  const settledGrossByGrant = new Map<string, number>();
  let cumSettledValue = 0;

  const settled: number[] = [];
  const pending: number[] = [];
  const unvested: number[] = [];

  for (const date of dates) {
    for (const e of vestEvents) {
      if (e.date === date) {
        vestedByGrant.set(e.grantId, (vestedByGrant.get(e.grantId) ?? 0) + e.grossShares);
      }
    }
    for (const e of settlementEvents) {
      if (e.date === date) {
        settledGrossByGrant.set(e.grantId, (settledGrossByGrant.get(e.grantId) ?? 0) + e.grossShares);
        const grant = grantsById.get(e.grantId);
        if (grant) cumSettledValue += e.netShares * priceFor(grant);
      }
    }

    settled.push(cumSettledValue);

    let cumPendingValue = 0;
    let cumUnvestedValue = 0;
    for (const g of grants) {
      const vested = vestedByGrant.get(g.id) ?? 0;
      const settledGross = settledGrossByGrant.get(g.id) ?? 0;
      const pendingShares = Math.max(0, vested - settledGross);
      if (pendingShares > 0) cumPendingValue += pendingShares * priceFor(g);

      if (g.vestingSchedule) {
        const remainingShares = Math.max(0, g.totalShares - vested);
        if (remainingShares > 0) cumUnvestedValue += remainingShares * priceFor(g);
      }
    }
    pending.push(cumPendingValue);
    unvested.push(cumUnvestedValue);
  }

  return { dates, settled, pending, unvested };
}
