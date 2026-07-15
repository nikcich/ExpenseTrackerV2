import { useRef, useState } from "react";
import { useRsuVests, useStocks, useGrants, useSales } from "@/store/store";
import type { RsuVest, Stock, Grant, Sale } from "@/types/types";
import {
  formatCurrency,
  formatShortDate,
  SHORTCUT_COOLDOWN,
} from "@/utils/utils";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import styles from "./RSU.module.scss";

const emptyStock = (): Partial<Stock> => ({ ticker: "", currentPrice: 0 });
const emptyGrant = (): Partial<Grant> => ({
  name: "",
  stockId: "",
  grantPrice: 0,
  totalShares: 0,
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
    saveGrantGuard.current = true;
    const grant: Grant = {
      id: editingGrant ?? "",
      name: grantForm.name,
      stockId: grantForm.stockId,
      grantPrice: Number(grantForm.grantPrice ?? 0),
      totalShares: Number(grantForm.totalShares),
    };
    if (editingGrant) {
      updateGrant(editingGrant, grant);
    } else {
      addGrant(grant);
    }
    setGrantForm(emptyGrant());
    setShowGrantForm(false);
    setEditingGrant(null);
    setTimeout(() => {
      saveGrantGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditGrant = (grant: Grant) => {
    setGrantForm({ ...grant });
    setEditingGrant(grant.id);
    setShowGrantForm(true);
  };

  const handleCancelGrant = () => {
    setGrantForm(emptyGrant());
    setShowGrantForm(false);
    setEditingGrant(null);
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
    </div>
  );
}
