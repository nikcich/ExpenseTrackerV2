import { useRef, useState, useEffect } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { useRsuVests, useStocks, useGrants, useSales } from "@/store/store";
import type {
  RsuVest,
  Stock,
  Grant,
  Sale,
  VestingFrequency,
} from "@/types/types";
import {
  formatCurrency,
  formatShortDate,
  SHORTCUT_COOLDOWN,
} from "@/utils/utils";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  computeForecast,
} from "@/utils/rsu-forecast";
import styles from "./RSU.module.scss";

const emptyStock = (): Partial<Stock> => ({ ticker: "", currentPrice: 0 });
const emptyGrant = (): Partial<Grant> => ({
  name: "",
  stockId: "",
  grantPrice: 0,
  totalShares: 0,
  vestingSchedule: undefined,
});
const emptyRsu = (): Partial<RsuVest> => ({
  grantId: "",
  vestDate: "",
  shares: 0,
  basisPrice: 0,
});
const emptySale = (): Partial<Sale> => ({
  stockId: "",
  date: "",
  shares: 0,
  salePrice: 0,
  basisPrice: 0,
});

const DISTRIBUTION_PRESETS: Record<string, (years: number) => number[]> = {
  equal: (years: number) => Array(years).fill(100 / years),
  front: (years: number) => {
    const weights = [50, 30, 15, 5];
    if (years <= weights.length)
      return weights.slice(0, years);
    const result = weights.map((w) => w);
    while (result.length < years) result.push(0);
    return result;
  },
  back: (years: number) => {
    const weights = [5, 15, 30, 50];
    if (years <= weights.length)
      return weights.slice(0, years);
    const result: number[] = [];
    while (result.length < years - weights.length) result.push(0);
    weights.forEach((w) => result.push(w));
    return result;
  },
};

export function RSU() {
  const { vests, addVest, updateVest, removeVest } = useRsuVests();
  const { stocks, addStock, updateStock, removeStock } = useStocks();
  const { grants, addGrant, updateGrant, removeGrant } = useGrants();
  const { sales, addSale, updateSale, removeSale } = useSales();

  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState<Partial<Stock>>(emptyStock());
  const [editingStock, setEditingStock] = useState<string | null>(null);

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState<Partial<Grant>>(emptyGrant());
  const [editingGrant, setEditingGrant] = useState<string | null>(null);
  const [schedulePreset, setSchedulePreset] = useState<string>("equal");
  const [scheduleForm, setScheduleForm] = useState({
    startDate: "",
    totalYears: 4,
    frequency: "quarterly" as VestingFrequency,
    distribution: [25, 25, 25, 25],
  });
  const [grantErrors, setGrantErrors] = useState<Set<string>>(new Set());
  const [selectedForecastGrantId, setSelectedForecastGrantId] = useState<
    string | null
  >(null);
  const [forecastUnit, setForecastUnit] = useState<"shares" | "dollars">("shares");
  const [forecastPrices, setForecastPrices] = useState<Map<string, number>>(new Map());

  const [showRsuForm, setShowRsuForm] = useState(false);
  const [rsuForm, setRsuForm] = useState<Partial<RsuVest>>(emptyRsu());
  const [editingRsu, setEditingRsu] = useState<string | null>(null);

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleForm, setSaleForm] = useState<Partial<Sale>>(emptySale());
  const [editingSale, setEditingSale] = useState<string | null>(null);

  const saveStockGuard = useRef(false);
  const saveGrantGuard = useRef(false);
  const saveRsuGuard = useRef(false);
  const saveSaleGuard = useRef(false);

  const stockMap = useRef(new Map(stocks.map((s) => [s.id, s])));
  stockMap.current = new Map(stocks.map((s) => [s.id, s]));
  const grantMap = useRef(new Map(grants.map((g) => [g.id, g])));
  grantMap.current = new Map(grants.map((g) => [g.id, g]));

  useEffect(() => {
    if (forecastPrices.size > 0 || grants.length === 0) return;
    const prices = new Map<string, number>();
    for (const g of grants) {
      if (prices.has(g.stockId)) continue;
      const stock = stockMap.current.get(g.stockId);
      prices.set(g.stockId, stock?.currentPrice ?? g.grantPrice);
    }
    setForecastPrices(prices);
  }, [grants, forecastPrices.size]);

  const sortedVests = [...vests].sort(
    (a, b) => new Date(b.vestDate).getTime() - new Date(a.vestDate).getTime(),
  );
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totalRsuValue = vests.reduce((s, v) => {
    const grant = grantMap.current.get(v.grantId);
    const stock = grant ? stockMap.current.get(grant.stockId) : undefined;
    return s + v.shares * (stock?.currentPrice ?? v.basisPrice);
  }, 0);

  const stockAppreciation = stocks
    .map((stock) => {
      const stockGrants = grants.filter((g) => g.stockId === stock.id);
      const stockGrantIds = new Set(stockGrants.map((g) => g.id));
      const stockVests = vests.filter((v) => stockGrantIds.has(v.grantId));

      const grantTotal = stockVests.reduce((s, v) => {
        const grant = stockGrants.find((g) => g.id === v.grantId);
        return s + v.shares * (grant?.grantPrice ?? 0);
      }, 0);
      const basisTotal = stockVests.reduce(
        (s, v) => s + v.shares * v.basisPrice,
        0,
      );
      const currentTotal = stockVests.reduce(
        (_s, v) => _s + v.shares * stock.currentPrice,
        0,
      );

      const grantDelta = currentTotal - grantTotal;
      const basisDelta = currentTotal - basisTotal;
      const grantPct = grantTotal > 0 ? (grantDelta / grantTotal) * 100 : 0;
      const basisPct = basisTotal > 0 ? (basisDelta / basisTotal) * 100 : 0;

      return {
        stock,
        grantTotal,
        basisTotal,
        currentTotal,
        grantDelta,
        basisDelta,
        grantPct,
        basisPct,
      };
    })
    .filter((s) => s.currentTotal > 0);

  const handleSaveStock = () => {
    if (saveStockGuard.current) return;
    if (!stockForm.ticker || !stockForm.currentPrice) return;
    saveStockGuard.current = true;
    const stock: Stock = {
      id: editingStock ?? "",
      ticker: stockForm.ticker,
      currentPrice: Number(stockForm.currentPrice),
    };
    if (editingStock) {
      updateStock(editingStock, stock);
    } else {
      addStock(stock);
    }
    setStockForm(emptyStock());
    setShowStockForm(false);
    setEditingStock(null);
    setTimeout(() => {
      saveStockGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditStock = (stock: Stock) => {
    setStockForm({ ...stock });
    setEditingStock(stock.id);
    setShowStockForm(true);
  };

  const handleCancelStock = () => {
    setStockForm(emptyStock());
    setShowStockForm(false);
    setEditingStock(null);
  };

  const handleSaveGrant = () => {
    if (saveGrantGuard.current) return;
    if (!grantForm.name || !grantForm.stockId || !grantForm.totalShares) return;

    const errors = new Set<string>();
    if (!scheduleForm.startDate) errors.add("startDate");
    if (scheduleForm.totalYears <= 0) errors.add("totalYears");
    const distSum = scheduleForm.distribution.reduce((a, b) => a + b, 0);
    if (Math.round(distSum * 100) / 100 !== 100) errors.add("distribution");
    if (errors.size > 0) {
      setGrantErrors(errors);
      return;
    }

    saveGrantGuard.current = true;
    setGrantErrors(new Set());
    const grant: Grant = {
      id: editingGrant ?? "",
      name: grantForm.name,
      stockId: grantForm.stockId,
      grantPrice: Number(grantForm.grantPrice ?? 0),
      totalShares: Number(grantForm.totalShares),
      vestingSchedule: {
        startDate: scheduleForm.startDate,
        totalYears: scheduleForm.totalYears,
        frequency: scheduleForm.frequency,
        distribution: scheduleForm.distribution,
      },
    };
    if (editingGrant) {
      updateGrant(editingGrant, grant);
    } else {
      addGrant(grant);
    }
    setGrantForm(emptyGrant());
    setShowGrantForm(false);
    setEditingGrant(null);
    setSchedulePreset("equal");
    setScheduleForm({
      startDate: "",
      totalYears: 4,
      frequency: "quarterly",
      distribution: [25, 25, 25, 25],
    });
    setTimeout(() => {
      saveGrantGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditGrant = (grant: Grant) => {
    setGrantForm({ ...grant });
    setEditingGrant(grant.id);
    if (grant.vestingSchedule) {
      setSchedulePreset("custom");
      setScheduleForm({
        startDate: grant.vestingSchedule.startDate,
        totalYears: grant.vestingSchedule.totalYears,
        frequency: grant.vestingSchedule.frequency,
        distribution: [...grant.vestingSchedule.distribution],
      });
    } else {
      setSchedulePreset("equal");
      setScheduleForm({
        startDate: "",
        totalYears: 4,
        frequency: "quarterly",
        distribution: [25, 25, 25, 25],
      });
    }
    setShowGrantForm(true);
  };

  const handleCancelGrant = () => {
    setGrantForm(emptyGrant());
    setShowGrantForm(false);
    setEditingGrant(null);
    setSchedulePreset("equal");
    setScheduleForm({
      startDate: "",
      totalYears: 4,
      frequency: "quarterly",
      distribution: [25, 25, 25, 25],
    });
  };

  const handleSaveRsu = () => {
    if (saveRsuGuard.current) return;
    if (
      !rsuForm.grantId ||
      !rsuForm.vestDate ||
      !rsuForm.shares ||
      !rsuForm.basisPrice
    )
      return;
    saveRsuGuard.current = true;
    const vest: RsuVest = {
      id: editingRsu ?? "",
      grantId: rsuForm.grantId,
      vestDate: rsuForm.vestDate,
      shares: Number(rsuForm.shares),
      basisPrice: Number(rsuForm.basisPrice),
    };
    if (editingRsu) {
      updateVest(editingRsu, vest);
    } else {
      addVest(vest);
    }
    setRsuForm(emptyRsu());
    setShowRsuForm(false);
    setEditingRsu(null);
    setTimeout(() => {
      saveRsuGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditRsu = (vest: RsuVest) => {
    setRsuForm({ ...vest });
    setEditingRsu(vest.id);
    setShowRsuForm(true);
  };

  const handleCancelRsu = () => {
    setRsuForm(emptyRsu());
    setShowRsuForm(false);
    setEditingRsu(null);
  };

  const handleSaveSale = () => {
    if (saveSaleGuard.current) return;
    if (
      !saleForm.stockId ||
      !saleForm.date ||
      !saleForm.shares ||
      !saleForm.salePrice ||
      !saleForm.basisPrice
    )
      return;
    saveSaleGuard.current = true;
    const sale: Sale = {
      id: editingSale ?? "",
      stockId: saleForm.stockId,
      date: saleForm.date,
      shares: Number(saleForm.shares),
      salePrice: Number(saleForm.salePrice),
      basisPrice: Number(saleForm.basisPrice),
    };
    if (editingSale) {
      updateSale(editingSale, sale);
    } else {
      addSale(sale);
    }
    setSaleForm(emptySale());
    setShowSaleForm(false);
    setEditingSale(null);
    setTimeout(() => {
      saveSaleGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditSale = (sale: Sale) => {
    setSaleForm({ ...sale });
    setEditingSale(sale.id);
    setShowSaleForm(true);
  };

  const handleCancelSale = () => {
    setSaleForm(emptySale());
    setShowSaleForm(false);
    setEditingSale(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.summaryRow}>
        {vests.length > 0 && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardTitle}>RSU Summary</span>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Total Shares</span>
                <span className={styles.summaryStatValue}>
                  {vests.reduce((s, v) => s + v.shares, 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Current Value</span>
                <span className={`${styles.summaryStatValue} ${styles.money}`}>
                  {formatCurrency(totalRsuValue)}
                </span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Events</span>
                <span className={styles.summaryStatValue}>{vests.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.sparklineRow}>
        {vests.length > 0 && (
          <div className={styles.sparklineCard}>
            <span className={styles.sparklineTitle}>Total RSU Value</span>
            {vests.length < 2 ? (
              <span className={styles.summaryEmpty}>
                Need at least 2 vesting events
              </span>
            ) : (
              <Sparkline
                data={(() => {
                  let running = 0;
                  return [...vests]
                    .sort(
                      (a, b) =>
                        new Date(a.vestDate).getTime() -
                        new Date(b.vestDate).getTime(),
                    )
                    .map((v) => {
                      const grant = grantMap.current.get(v.grantId);
                      const stock = grant
                        ? stockMap.current.get(grant.stockId)
                        : undefined;
                      running +=
                        v.shares * (stock?.currentPrice ?? v.basisPrice);
                      return {
                        label: formatShortDate(v.vestDate),
                        value: running,
                      };
                    });
                })()}
                color="var(--fg-success, #4ade80)"
                showLabels="auto"
              />
            )}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Stocks</span>
          <button
            className={styles.addBtn}
            onClick={() => {
              handleCancelStock();
              setShowStockForm(!showStockForm);
            }}
          >
            {showStockForm ? "Cancel" : "+ Add Stock"}
          </button>
        </div>

        {showStockForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Ticker</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={stockForm.ticker ?? ""}
                onChange={(e) =>
                  setStockForm({
                    ...stockForm,
                    ticker: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. AAPL"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Current Price</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={stockForm.currentPrice ?? ""}
                onChange={(e) =>
                  setStockForm({
                    ...stockForm,
                    currentPrice: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveStock}>
                Save
              </button>
              <button className={styles.cancelBtn} onClick={handleCancelStock}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {stocks.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className={styles.num}>Current Price</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id}>
                    <td>{s.ticker}</td>
                    <td className={`${styles.num} ${styles.money}`}>
                      {formatCurrency(s.currentPrice)}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleEditStock(s)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => removeStock(s.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Grants</span>
          <button
            className={styles.addBtn}
            onClick={() => {
              handleCancelGrant();
              setShowGrantForm(!showGrantForm);
            }}
          >
            {showGrantForm ? "Cancel" : "+ Add Grant"}
          </button>
        </div>

        {showGrantForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={grantForm.name ?? ""}
                onChange={(e) =>
                  setGrantForm({ ...grantForm, name: e.target.value })
                }
                placeholder="e.g. Q1 2024 RSU Grant"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Stock</span>
              <select
                className={styles.fieldInput}
                value={grantForm.stockId ?? ""}
                onChange={(e) =>
                  setGrantForm({ ...grantForm, stockId: e.target.value })
                }
              >
                <option value="">Select stock...</option>
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ticker}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Grant Price</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={grantForm.grantPrice ?? ""}
                onChange={(e) =>
                  setGrantForm({
                    ...grantForm,
                    grantPrice: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Total Shares</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="1"
                value={grantForm.totalShares ?? ""}
                onChange={(e) =>
                  setGrantForm({
                    ...grantForm,
                    totalShares: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className={styles.formRowBreak} />

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Start Date</span>
              <input
                className={`${styles.fieldInput} ${grantErrors.has("startDate") ? styles.fieldError : ""}`}
                type="date"
                value={scheduleForm.startDate}
                onChange={(e) => {
                  setScheduleForm({
                    ...scheduleForm,
                    startDate: e.target.value,
                  });
                  if (e.target.value) {
                    setGrantErrors((prev) => {
                      const next = new Set(prev);
                      next.delete("startDate");
                      return next;
                    });
                  }
                }}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Total Years</span>
              <input
                className={styles.fieldInput}
                type="number"
                min={1}
                max={10}
                step={1}
                value={scheduleForm.totalYears}
                onChange={(e) => {
                  const years = Math.max(
                    1,
                    Math.min(10, Number(e.target.value)),
                  );
                  const fn =
                    DISTRIBUTION_PRESETS[schedulePreset] ??
                    DISTRIBUTION_PRESETS.equal;
                  setScheduleForm({
                    ...scheduleForm,
                    totalYears: years,
                    distribution: fn(years),
                  });
                }}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Frequency</span>
              <select
                className={styles.fieldInput}
                value={scheduleForm.frequency}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    frequency: e.target.value as VestingFrequency,
                  })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Distribution</span>
              <select
                className={styles.fieldInput}
                value={schedulePreset}
                onChange={(e) => {
                  const preset = e.target.value;
                  setSchedulePreset(preset);
                  if (preset !== "custom") {
                    const fn = DISTRIBUTION_PRESETS[preset];
                    setScheduleForm({
                      ...scheduleForm,
                      distribution: fn(scheduleForm.totalYears),
                    });
                  }
                }}
              >
                <option value="equal">Equal</option>
                <option value="front">Front-loaded</option>
                <option value="back">Back-loaded</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {schedulePreset === "custom" && (
              <div className={styles.distributionInputs}>
                {scheduleForm.distribution.map((pct, idx) => (
                  <div key={idx} className={styles.distributionField}>
                    <span className={styles.fieldLabel}>
                      Year {idx + 1} %
                    </span>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={pct}
                      onChange={(e) => {
                        const newDist = [...scheduleForm.distribution];
                        newDist[idx] = Number(e.target.value);
                        setScheduleForm({
                          ...scheduleForm,
                          distribution: newDist,
                        });
                        const sum = newDist.reduce((a, b) => a + b, 0);
                        if (Math.round(sum * 100) / 100 === 100) {
                          setGrantErrors((prev) => {
                            const next = new Set(prev);
                            next.delete("distribution");
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                ))}
                <span
                  className={`${styles.distributionTotal} ${
                    Math.round(
                      scheduleForm.distribution.reduce(
                        (a, b) => a + b,
                        0,
                      ) * 100,
                    ) / 100 === 100
                      ? styles.distValid
                      : styles.distInvalid
                  } ${grantErrors.has("distribution") ? styles.distError : ""}`}
                >
                  {scheduleForm.distribution
                    .reduce((a, b) => a + b, 0)
                    .toFixed(0)}
                  % / 100%
                </span>
              </div>
            )}

            {schedulePreset !== "custom" && (
              <div className={styles.distributionPreview}>
                {scheduleForm.distribution.map((pct, idx) => (
                  <span key={idx} className={styles.distChip}>
                    Y{idx + 1}: {pct.toFixed(1)}%
                  </span>
                ))}
              </div>
            )}

            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveGrant}>
                Save
              </button>
              <button className={styles.cancelBtn} onClick={handleCancelGrant}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {grants.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stock</th>
                  <th className={styles.num}>Grant Price</th>
                  <th className={styles.num}>Total Shares</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => {
                  const stock = stockMap.current.get(g.stockId);
                  const vestedShares = vests
                    .filter((v) => v.grantId === g.id)
                    .reduce((s, v) => s + v.shares, 0);
                  return (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{stock?.ticker ?? "—"}</td>
                      <td className={styles.num}>
                        {formatCurrency(g.grantPrice)}
                      </td>
                      <td className={styles.num}>
                        {vestedShares.toLocaleString()} /{" "}
                        {g.totalShares.toLocaleString()}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditGrant(g)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => removeGrant(g.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>RSU Vests</span>
          <button
            className={styles.addBtn}
            onClick={() => {
              handleCancelRsu();
              setShowRsuForm(!showRsuForm);
            }}
          >
            {showRsuForm ? "Cancel" : "+ Add Vest"}
          </button>
        </div>

        {showRsuForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Grant</span>
              <select
                className={styles.fieldInput}
                value={rsuForm.grantId ?? ""}
                onChange={(e) =>
                  setRsuForm({ ...rsuForm, grantId: e.target.value })
                }
              >
                <option value="">Select grant...</option>
                {grants.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Vest Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={rsuForm.vestDate ?? ""}
                onChange={(e) =>
                  setRsuForm({ ...rsuForm, vestDate: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Shares</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={rsuForm.shares ?? ""}
                onChange={(e) =>
                  setRsuForm({ ...rsuForm, shares: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Basis Price</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={rsuForm.basisPrice ?? ""}
                onChange={(e) =>
                  setRsuForm({ ...rsuForm, basisPrice: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveRsu}>
                Save
              </button>
              <button className={styles.cancelBtn} onClick={handleCancelRsu}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {sortedVests.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Grant</th>
                  <th>Date</th>
                  <th>Shares</th>
                  <th className={styles.num}>Basis Price</th>
                  <th className={styles.num}>Total Value</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {sortedVests.map((v) => {
                  const grant = grantMap.current.get(v.grantId);
                  return (
                    <tr key={v.id}>
                      <td>{grant?.name ?? "—"}</td>
                      <td>{formatShortDate(v.vestDate)}</td>
                      <td>{v.shares.toLocaleString()}</td>
                      <td className={styles.num}>
                        {formatCurrency(v.basisPrice)}
                      </td>
                      <td className={styles.num}>
                        {formatCurrency(v.shares * v.basisPrice)}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditRsu(v)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => removeVest(v.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stockAppreciation.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Appreciation</span>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th className={styles.num}>Current Value</th>
                  <th className={styles.num}>At Grant</th>
                  <th className={styles.num}>From Grant</th>
                  <th className={styles.num}>At Basis</th>
                  <th className={styles.num}>From Basis</th>
                </tr>
              </thead>
              <tbody>
                {stockAppreciation.map((row) => (
                  <tr key={row.stock.id}>
                    <td>{row.stock.ticker}</td>
                    <td className={`${styles.num} ${styles.money}`}>
                      {formatCurrency(row.currentTotal)}
                    </td>
                    <td className={styles.num}>
                      {formatCurrency(row.grantTotal)}
                    </td>
                    <td
                      className={`${styles.num} ${row.grantDelta >= 0 ? styles.money : styles.debtColor}`}
                    >
                      {row.grantDelta >= 0 ? "+" : ""}
                      {formatCurrency(row.grantDelta)} (
                      {row.grantPct.toFixed(1)}%)
                    </td>
                    <td className={styles.num}>
                      {formatCurrency(row.basisTotal)}
                    </td>
                    <td
                      className={`${styles.num} ${row.basisDelta >= 0 ? styles.money : styles.debtColor}`}
                    >
                      {row.basisDelta >= 0 ? "+" : ""}
                      {formatCurrency(row.basisDelta)} (
                    {row.basisPct.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Sales</span>
          <button
            className={styles.addBtn}
            onClick={() => {
              handleCancelSale();
              setShowSaleForm(!showSaleForm);
            }}
          >
            {showSaleForm ? "Cancel" : "+ Add Sale"}
          </button>
        </div>

        {showSaleForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Stock</span>
              <select
                className={styles.fieldInput}
                value={saleForm.stockId ?? ""}
                onChange={(e) =>
                  setSaleForm({ ...saleForm, stockId: e.target.value })
                }
              >
                <option value="">Select stock...</option>
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ticker}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={saleForm.date ?? ""}
                onChange={(e) =>
                  setSaleForm({ ...saleForm, date: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Shares</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={saleForm.shares ?? ""}
                onChange={(e) =>
                  setSaleForm({ ...saleForm, shares: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Sale Price</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={saleForm.salePrice ?? ""}
                onChange={(e) =>
                  setSaleForm({
                    ...saleForm,
                    salePrice: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Basis Price</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={saleForm.basisPrice ?? ""}
                onChange={(e) =>
                  setSaleForm({
                    ...saleForm,
                    basisPrice: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveSale}>
                Save
              </button>
              <button className={styles.cancelBtn} onClick={handleCancelSale}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {sortedSales.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Date</th>
                  <th>Shares</th>
                  <th className={styles.num}>Sale Price</th>
                  <th className={styles.num}>Basis Price</th>
                  <th className={styles.num}>Proceeds</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map((s) => {
                  const stock = stockMap.current.get(s.stockId);
                  const proceeds = (s.salePrice - s.basisPrice) * s.shares;
                  return (
                    <tr key={s.id}>
                      <td>{stock?.ticker ?? "—"}</td>
                      <td>{formatShortDate(s.date)}</td>
                      <td>{s.shares.toLocaleString()}</td>
                      <td className={styles.num}>
                        {formatCurrency(s.salePrice)}
                      </td>
                      <td className={styles.num}>
                        {formatCurrency(s.basisPrice)}
                      </td>
                      <td
                        className={`${styles.num} ${proceeds >= 0 ? styles.money : styles.debtColor}`}
                      >
                        {proceeds >= 0 ? "+" : ""}
                        {formatCurrency(proceeds)}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditSale(s)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => removeSale(s.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(() => {
        const grantsWithSchedule = grants.filter(
          (g) => g.vestingSchedule,
        );
        if (grantsWithSchedule.length === 0 && vests.length === 0) return null;

        const allPoints: {
          date: string;
          actual: number;
          forecast: number;
        }[] = [];

        const grantForecasts = grantsWithSchedule.map((g) => {
          const forecast = computeForecast(g, vests, stocks);
          const futureVests = forecast.filter((f) => !f.isPast);
          const remainingShares = futureVests.reduce(
            (s, f) => s + f.shares,
            0,
          );
          const remainingValue = futureVests.reduce(
            (s, f) => s + f.projectedValue,
            0,
          );
          const stock = stockMap.current.get(g.stockId);
          return { grant: g, forecast, futureVests, remainingShares, remainingValue, ticker: stock?.ticker };
        });

        type StockEntry = { shares: number; stockId: string };
        const actualByDate = new Map<string, StockEntry[]>();
        for (const v of vests) {
          const grant = grantMap.current.get(v.grantId);
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
            const price = forecastPrices.get(e.stockId) ?? 0;
            return s + e.shares * (forecastUnit === "dollars" ? price : 1);
          }, 0);


        const allDates = new Set([...actualByDate.keys(), ...forecastByDate.keys()]);
        const sortedDates = [...allDates].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime(),
        );

        let cumActual = 0;
        let cumForecast = 0;
        for (const date of sortedDates) {
          cumActual += sumStockValue(actualByDate.get(date) ?? []);
          cumForecast += sumStockValue(forecastByDate.get(date) ?? []);
          allPoints.push({
            date,
            actual: cumActual,
            forecast: cumActual + cumForecast,
          });
        }

        const totalRemaining = grantForecasts.reduce(
          (s, gf) => s + gf.remainingShares,
          0,
        );
        const totalRemainingValue = grantForecasts.reduce((s, gf) => {
          const price = forecastPrices.get(gf.grant.stockId) ?? 0;
          return s + gf.remainingShares * (forecastUnit === "dollars" ? price : 0);
        }, 0);

        return (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                Vesting Forecast
              </span>
              <div className={styles.forecastControls}>
                <SegmentGroup.Root
                  value={forecastUnit}
                  onValueChange={(e) => setForecastUnit(e.value as "shares" | "dollars")}
                  size="sm"
                >
                  <SegmentGroup.Indicator />
                  <SegmentGroup.Items items={["shares", "dollars"]} />
                </SegmentGroup.Root>
                {forecastUnit === "dollars" && (
                  <div className={styles.priceInputs}>
                    {[...forecastPrices.entries()].map(([stockId, price]) => {
                      const stock = stockMap.current.get(stockId);
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
                          <span className={styles.priceSliderValue}>
                            {formatCurrency(price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.forecastSummaryRow}>
              <div className={styles.forecastSummaryStat}>
                <span className={styles.summaryStatLabel}>
                  Remaining Shares
                </span>
                <span className={styles.summaryStatValue}>
                  {totalRemaining.toLocaleString()}
                </span>
              </div>
              <div className={styles.forecastSummaryStat}>
                <span className={styles.summaryStatLabel}>
                  Projected Value
                </span>
                <span
                  className={`${styles.summaryStatValue} ${styles.money}`}
                >
                  {forecastUnit === "dollars"
                    ? formatCurrency(totalRemainingValue)
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
                      name: "Actual Vested",
                      y: allPoints.map((p) => p.actual),
                      color: "#4ade80",
                    },
                    {
                      name: "Cumulative Forecast",
                      y: allPoints.map((p) => p.forecast),
                      color: "#60a5fa",
                    },
                  ]}
                  legend
                  legendDirection="h"
                  lineShape="hv"
                />
              </div>
            )}

            {allPoints.length >= 2 && (() => {
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
              const allYears = new Set([...yearlyActual.keys(), ...yearlyForecast.keys()]);
              const sortedYears = [...allYears].sort();
              if (sortedYears.length === 0) return null;
              return (
                <div className={styles.forecastChartCard}>
                  <BarChart
                    x={sortedYears}
                    barCharts={[
                      {
                        name: "Actual Vested",
                        y: sortedYears.map((y) => yearlyActual.get(y) ?? 0),
                        color: "#4ade80",
                      },
                      {
                        name: "Forecast",
                        y: sortedYears.map((y) => yearlyForecast.get(y) ?? 0),
                        color: "#60a5fa",
                      },
                    ]}
                    legend
                    legendDirection="h"
                  />
                </div>
              );
            })()}

            {grantForecasts.length > 1 && (
              <div className={styles.forecastGrantSelector}>
                <select
                  className={styles.fieldInput}
                  value={selectedForecastGrantId ?? grantForecasts[0].grant.id}
                  onChange={(e) =>
                    setSelectedForecastGrantId(e.target.value)
                  }
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

            {(() => {
              const activeId =
                selectedForecastGrantId ?? grantForecasts[0]?.grant.id;
              const gf = grantForecasts.find(
                (g) => g.grant.id === activeId,
              );
              if (!gf) return null;
              return (
                <div className={styles.forecastGrantBlock}>
                  <div className={styles.tableCard}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th className={styles.num}>Shares</th>
                          <th className={styles.num}>Basis Price</th>
                          <th className={styles.num}>Projected Value</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gf.forecast.map((f, idx) => (
                          <tr
                            key={idx}
                            className={
                              f.isPast ? styles.forecastPastRow : undefined
                            }
                          >
                            <td>{formatShortDate(f.date)}</td>
                            <td className={styles.num}>
                              {f.shares.toLocaleString()}
                            </td>
                            <td className={styles.num}>
                              {formatCurrency(f.basisPrice)}
                            </td>
                            <td className={styles.num}>
                              {formatCurrency(f.projectedValue)}
                            </td>
                            <td>
                              <span
                                className={
                                  f.isPast
                                    ? styles.forecastStatusPast
                                    : styles.forecastStatusFuture
                                }
                              >
                                {f.isPast ? "Vested" : "Upcoming"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

    </div>
  );
}
