import { useEffect, useRef, useState } from "react";
import { useRsuVests, useBalanceSnapshots, useStocks, useGrants } from "@/store/store";
import type { BalanceSnapshot } from "@/types/types";
import { formatCurrency, formatDate, formatShortDate, SHORTCUT_COOLDOWN } from "@/utils/utils";
import styles from "./Accounts.module.scss";

const emptySnapshot = (): Partial<BalanceSnapshot> => ({ accountName: "", date: "", balance: 0, notes: "", type: "asset" });

export function Accounts() {
  const { vests } = useRsuVests();
  const { snapshots, addSnapshot, updateSnapshot, removeSnapshot } = useBalanceSnapshots();
  const { stocks } = useStocks();
  const { grants } = useGrants();

  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState<Partial<BalanceSnapshot>>(emptySnapshot());
  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);
  const saveSnapshotGuard = useRef(false);

  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const assets = snapshots.filter((s) => (s.type ?? "asset") !== "debt");
  const debts = snapshots.filter((s) => s.type === "debt");
  const latestByAccount = (items: BalanceSnapshot[]): Map<string, BalanceSnapshot> => {
    const map = new Map<string, BalanceSnapshot>();
    for (const s of items) {
      const existing = map.get(s.accountName);
      if (!existing || new Date(s.date) > new Date(existing.date)) {
        map.set(s.accountName, s);
      }
    }
    return map;
  };

  const stockMap = useRef(new Map(stocks.map((s) => [s.id, s])));
  stockMap.current = new Map(stocks.map((s) => [s.id, s]));
  const grantMap = useRef(new Map(grants.map((g) => [g.id, g])));
  grantMap.current = new Map(grants.map((g) => [g.id, g]));

  const totalRsuValue = vests.reduce((s, v) => {
    const grant = grantMap.current.get(v.grantId);
    const stock = grant ? stockMap.current.get(grant.stockId) : undefined;
    return s + v.shares * (stock?.currentPrice ?? v.basisPrice);
  }, 0);

  const totalAssets = [...latestByAccount(assets).values()].reduce((s, a) => s + a.balance, 0) + totalRsuValue;
  const totalDebts = [...latestByAccount(debts).values()].reduce((s, d) => s + Math.abs(d.balance), 0);
  const activeDebts = [...Array.from(new Set(debts.map((s) => s.accountName)))]
    .map((name) => {
      const accountSnapshots = debts
        .filter((s) => s.accountName === name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { name, snapshots: accountSnapshots };
    })
    .filter(({ snapshots }) => snapshots[0]?.balance !== 0);

  const handleSaveSnapshot = () => {
    if (saveSnapshotGuard.current) return;
    if (!snapshotForm.accountName || !snapshotForm.date || snapshotForm.balance === undefined || snapshotForm.balance === null) return;
    saveSnapshotGuard.current = true;
    const snapshot: BalanceSnapshot = {
      id: editingSnapshot ?? "",
      accountName: snapshotForm.accountName,
      date: snapshotForm.date,
      balance: Number(snapshotForm.balance),
      notes: snapshotForm.notes ?? "",
      type: snapshotForm.type ?? "asset",
    };
    if (editingSnapshot) {
      updateSnapshot(editingSnapshot, snapshot);
    } else {
      addSnapshot(snapshot);
    }
    setSnapshotForm(emptySnapshot());
    setShowSnapshotForm(false);
    setEditingSnapshot(null);
    setTimeout(() => { saveSnapshotGuard.current = false; }, SHORTCUT_COOLDOWN);
  };

  const handleEditSnapshot = (snapshot: BalanceSnapshot) => {
    setSnapshotForm({ ...snapshot });
    setEditingSnapshot(snapshot.id);
    setShowSnapshotForm(true);
  };

  const handleCancelSnapshot = () => {
    setSnapshotForm(emptySnapshot());
    setShowSnapshotForm(false);
    setEditingSnapshot(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.netWorthRow}>
        <div className={styles.netWorthCard}>
          <span className={styles.summaryCardTitle}>Net Worth</span>
          <span className={`${styles.netWorthValue} ${totalAssets - totalDebts >= 0 ? styles.money : styles.debtColor}`}>{formatCurrency(totalAssets - totalDebts)}</span>
          <span className={styles.netWorthBreakdown}>
            {totalRsuValue > 0 && (
              <><span className={styles.money}>{formatCurrency(totalRsuValue)}</span>{" RSU"}</>
            )}
            {totalRsuValue > 0 && totalAssets - totalRsuValue > 0 && <span className={styles.money}>{" + "}</span>}
            {totalAssets - totalRsuValue > 0 && (
              <><span className={styles.money}>{formatCurrency(totalAssets - totalRsuValue)}</span>{" accounts"}</>
            )}
            {(totalRsuValue > 0 || totalAssets - totalRsuValue > 0) && totalDebts > 0 && <span className={styles.debtColor}>{" – "}</span>}
            {totalDebts > 0 && (
              <><span className={styles.debtColor}>{formatCurrency(totalDebts)}</span>{" debts"}</>
            )}
          </span>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Assets</span>
          {assets.length === 0 ? (
            <span className={styles.summaryEmpty}>No data</span>
          ) : (
            <div className={styles.summaryBalances}>
              {[...Array.from(new Set(assets.map((s) => s.accountName)))].map((name) => {
                const accountSnapshots = assets
                  .filter((s) => s.accountName === name)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = accountSnapshots[0];
                const prev = accountSnapshots[1];
                let delta: { isUp: boolean; pct: number } | null = null;
                if (prev && prev.balance !== 0) {
                  const pct = ((latest.balance - prev.balance) / Math.abs(prev.balance)) * 100;
                  delta = { isUp: latest.balance > prev.balance, pct };
                }
                return (
                  <div key={name} className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>{name}</span>
                    <span className={`${styles.summaryStatValue} ${styles.money}`}>
                      {formatCurrency(latest.balance)}
                    </span>
                    <span className={styles.balanceMeta}>
                      {delta && (
                        <span className={delta.isUp ? styles.deltaUp : styles.deltaDown}>
                          <span className={styles.deltaArrow}>{delta.isUp ? "↑" : "↓"}</span>
                          {Math.round(Math.abs(delta.pct))}%
                        </span>
                      )}
                      <span className={styles.summaryBalanceDate}>{formatDate(latest.date)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {activeDebts.length > 0 && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardTitle}>Debts</span>
            <div className={styles.summaryBalances}>
              {activeDebts.map(({ name, snapshots: accountSnapshots }) => {
              const latest = accountSnapshots[0];
              const prev = accountSnapshots[1];
              let delta: { isUp: boolean; pct: number } | null = null;
              if (prev && prev.balance !== 0) {
                const pct = ((latest.balance - prev.balance) / Math.abs(prev.balance)) * 100;
                delta = { isUp: latest.balance > prev.balance, pct };
              }
              return (
                <div key={name} className={styles.summaryStat}>
                  <span className={styles.summaryStatLabel}>{name}</span>
                  <span className={`${styles.summaryStatValue} ${styles.debtColor}`}>
                    {formatCurrency(Math.abs(latest.balance))}
                  </span>
                  <span className={styles.balanceMeta}>
                    {delta && (
                      <span className={delta.isUp ? styles.deltaDown : styles.deltaUp}>
                        <span className={styles.deltaArrow}>{delta.isUp ? "↑" : "↓"}</span>
                        {Math.round(Math.abs(delta.pct))}%
                      </span>
                    )}
                    <span className={styles.summaryBalanceDate}>{formatDate(latest.date)}</span>
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      <div className={styles.sparklineRow}>
        <div className={styles.sparklineCard}>
          <span className={styles.sparklineTitle}>Total Portfolio Balance</span>
          {snapshots.length < 2 ? (
            <span className={styles.summaryEmpty}>Need at least 2 snapshots</span>
          ) : (
            <Sparkline
              data={(() => {
                const assets = snapshots.filter((s) => (s.type ?? "asset") !== "debt");

                const byAccount = new Map<string, BalanceSnapshot[]>();
                for (const s of assets) {
                  const list = byAccount.get(s.accountName) ?? [];
                  list.push(s);
                  byAccount.set(s.accountName, list);
                }
                for (const list of byAccount.values()) {
                  list.sort((a, b) => a.date.localeCompare(b.date));
                }

                const allDates = [...new Set(assets.map((s) => s.date.slice(0, 10)))].sort();

                const current = new Map<string, number>();
                const ptr = new Map<string, number>();
                for (const k of byAccount.keys()) ptr.set(k, 0);

                return allDates.map((date) => {
                  for (const [acct, hist] of byAccount) {
                    let i = ptr.get(acct)!;
                    while (i < hist.length && hist[i].date.slice(0, 10) <= date) {
                      current.set(acct, hist[i].balance);
                      i++;
                    }
                    ptr.set(acct, i);
                  }
                  let total = 0;
                  for (const v of current.values()) total += v;
                  return { label: formatShortDate(date), value: total };
                });
              })()}
              color="var(--fg-info, #60a5fa)"
            />
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Balance Snapshots</span>
          <button className={styles.addBtn} onClick={() => { handleCancelSnapshot(); setShowSnapshotForm(!showSnapshotForm); }}>
            {showSnapshotForm ? "Cancel" : "+ Add Snapshot"}
          </button>
        </div>

        {showSnapshotForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Account</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={snapshotForm.accountName ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, accountName: e.target.value })}
                placeholder="e.g. 401k - Fidelity"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={snapshotForm.date ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, date: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Balance</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={snapshotForm.balance ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, balance: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Notes</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={snapshotForm.notes ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, notes: e.target.value })}
                placeholder="optional"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type</span>
              <select
                className={styles.fieldInput}
                value={snapshotForm.type ?? "asset"}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, type: e.target.value as "asset" | "debt" })}
              >
                <option value="asset">Asset</option>
                <option value="debt">Debt</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveSnapshot}>Save</button>
              <button className={styles.cancelBtn} onClick={handleCancelSnapshot}>Cancel</button>
            </div>
          </div>
        )}

        {sortedSnapshots.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Date</th>
                  <th className={styles.num}>Balance</th>
                  <th>Notes</th>
                  <th>Type</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {sortedSnapshots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.accountName}</td>
                    <td>{formatDate(s.date)}</td>
                    <td className={`${styles.num} ${s.balance >= 0 ? styles.money : styles.debtMoney}`}>{formatCurrency(s.balance)}</td>
                    <td>{s.notes ?? ""}</td>
                    <td><span className={s.type === "debt" ? styles.typeDebt : styles.typeAsset}>{(s.type ?? "asset").toUpperCase()}</span></td>
                    <td className={styles.actionsCell}>
                      <button className={styles.actionBtn} onClick={() => handleEditSnapshot(s)}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => removeSnapshot(s.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 70;
  const pad = { top: 4, right: 40, bottom: 24, left: 40 };
  const innerW = Math.max(width - pad.left - pad.right, 1);
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(...values);
  const yRange = yMax - yMin || 1;

  const xScale = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v: number) => pad.top + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.value)}`).join("");
  const areaD = `${pathD}L${xScale(data.length - 1)},${yScale(0)}L${xScale(0)},${yScale(0)}Z`;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg width={width} height={height} className={styles.sparklineSvg}>
        <path d={areaD} fill={color} opacity={0.1} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => {
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const isMid = data.length > 2 && i === Math.floor((data.length - 1) / 2);
          return isFirst || isLast || isMid ? (
            <text
              key={i}
              x={xScale(i)}
              y={height - 4}
              textAnchor="middle"
              fill="var(--fg-subtle, #6b6b7b)"
              fontSize="8"
            >
              {d.label}
            </text>
          ) : null;
        })}
      </svg>
    </div>
  );
}
