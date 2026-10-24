import { useEffect, useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { FaCoins } from "react-icons/fa";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useRsuVests,
  useRsuSettlements,
  useStocks,
  useGrants,
  useSales,
  useHasRsuData,
} from "@/store/store";
import { computeRsuPortfolioValue } from "@/utils/rsu-forecast";
import { StocksSection } from "./StocksSection";
import { GrantsSection } from "./GrantsSection";
import { VestsSection } from "./VestsSection";
import { SettlementsSection } from "./SettlementsSection";
import { SalesSection } from "./SalesSection";
import { AppreciationSection } from "./AppreciationSection";
import { ForecastSection } from "./ForecastSection";
import { TotalValueSection } from "./TotalValueSection";
import { SummaryHeader } from "./SummaryHeader";
import {
  buildEntityMaps,
  computeStockAppreciation,
  computeUnvestedSummary,
  computePendingSettlementSummary,
  buildValueTimeline,
  buildForecastChartData,
  buildTotalValueRows,
} from "./rsuPageUtils";
import styles from "./RSU.module.scss";

type View = "overview" | "manage";

const VIEW_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "manage", label: "Manage Data" },
];

export function RSU() {
  const { vests, addVest, updateVest, removeVest } = useRsuVests();
  const { settlements, addSettlement, updateSettlement, removeSettlement } = useRsuSettlements();
  const { stocks, addStock, updateStock, removeStock } = useStocks();
  const { grants, addGrant, updateGrant, removeGrant } = useGrants();
  const { sales, addSale, updateSale, removeSale } = useSales();
  const hasData = useHasRsuData();

  const [view, setView] = useState<View>("overview");
  const [selectedForecastGrantId, setSelectedForecastGrantId] = useState<string | null>(null);
  const [forecastUnit, setForecastUnit] = useState<"shares" | "dollars">("shares");
  const [forecastPrices, setForecastPrices] = useState<Map<string, number>>(new Map());
  const [summaryMode, setSummaryMode] = useState<"stock" | "grant">("stock");

  const { stockMap, grantMap } = useMemo(() => buildEntityMaps(stocks, grants), [stocks, grants]);

  useEffect(() => {
    setForecastPrices((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const g of grants) {
        if (!next.has(g.stockId)) {
          next.set(g.stockId, stockMap.get(g.stockId)?.currentPrice ?? g.grantPrice);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [grants, stockMap]);

  const totalRsuValue = useMemo(
    () => computeRsuPortfolioValue(settlements, grantMap, stockMap),
    [settlements, grantMap, stockMap]
  );

  const stockAppreciation = useMemo(
    () => computeStockAppreciation(stocks, grants, settlements),
    [stocks, grants, settlements]
  );

  const valueTimeline = useMemo(
    () => buildValueTimeline(grants, vests, settlements, stockMap),
    [grants, vests, settlements, stockMap]
  );

  const unvestedSummary = useMemo(
    () => computeUnvestedSummary(grants, vests, stocks),
    [grants, vests, stocks]
  );

  const pendingSettlementSummary = useMemo(
    () => computePendingSettlementSummary(grants, vests, settlements, stockMap),
    [grants, vests, settlements, stockMap]
  );

  const forecastChartData = useMemo(
    () => buildForecastChartData(grants, vests, stocks, grantMap, stockMap, forecastPrices, forecastUnit),
    [grants, vests, stocks, grantMap, stockMap, forecastPrices, forecastUnit]
  );

  const totalValueRows = useMemo(
    () => buildTotalValueRows(summaryMode, stocks, grants, vests, settlements, stockMap, forecastPrices),
    [summaryMode, stocks, grants, vests, settlements, stockMap, forecastPrices]
  );

  return (
    <GenericPage
      title="RSU"
      hasRange={false}
      needsData={false}
      actions={
        hasData ? (
          <SegmentGroup.Root value={view} onValueChange={(e) => setView(e.value as View)} size="sm">
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={VIEW_ITEMS} />
          </SegmentGroup.Root>
        ) : undefined
      }
    >
      {!hasData ? (
        <EmptyState
          icon={<FaCoins />}
          title="No RSU data yet"
          description="Add a stock to start tracking your RSU grants, vests, and settlements."
        />
      ) : view === "overview" ? (
        <div className={styles.page}>
          <SummaryHeader
            vests={vests}
            settlements={settlements}
            totalRsuValue={totalRsuValue}
            timeline={valueTimeline}
            unvested={unvestedSummary}
            pendingSettlement={pendingSettlementSummary}
          />
          <TotalValueSection rows={totalValueRows} mode={summaryMode} setMode={setSummaryMode} />
          <AppreciationSection rows={stockAppreciation} />
          <ForecastSection
            grants={grants}
            vests={vests}
            stockMap={stockMap}
            chartData={forecastChartData}
            forecastUnit={forecastUnit}
            setForecastUnit={setForecastUnit}
            forecastPrices={forecastPrices}
            setForecastPrices={setForecastPrices}
            selectedForecastGrantId={selectedForecastGrantId}
            setSelectedForecastGrantId={setSelectedForecastGrantId}
          />
        </div>
      ) : (
        <div className={styles.page}>
          <StocksSection
            stocks={stocks}
            grants={grants}
            onAdd={addStock}
            onUpdate={updateStock}
            onRemove={removeStock}
          />

          <GrantsSection
            grants={grants}
            stocks={stocks}
            stockMap={stockMap}
            vests={vests}
            settlements={settlements}
            onAdd={addGrant}
            onUpdate={updateGrant}
            onRemove={removeGrant}
          />

          <VestsSection
            vests={vests}
            grants={grants}
            grantMap={grantMap}
            onAdd={addVest}
            onUpdate={updateVest}
            onRemove={removeVest}
          />

          <SettlementsSection
            settlements={settlements}
            grants={grants}
            grantMap={grantMap}
            onAdd={addSettlement}
            onUpdate={updateSettlement}
            onRemove={removeSettlement}
          />

          <SalesSection
            sales={sales}
            stocks={stocks}
            stockMap={stockMap}
            onAdd={addSale}
            onUpdate={updateSale}
            onRemove={removeSale}
          />
        </div>
      )}
    </GenericPage>
  );
}
